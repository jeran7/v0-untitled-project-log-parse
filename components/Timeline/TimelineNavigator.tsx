"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import * as d3 from "d3"
import type { RootState } from "@/lib/store"
import type {
  TimelineDataPoint,
  TimelineNavigatorProps,
  AggregatedTimelineData,
  TimelineZoomLevel,
  TimeSelection,
} from "@/types/timeline"
import { setTimeSelection, setZoomLevel, setJumpToTimestamp } from "@/lib/slices/timelineSlice"
import { debounce } from "lodash"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ZoomIn, ZoomOut, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"

/**
 * Constants for timeline visualization
 */
const MARGIN = { top: 20, right: 30, bottom: 30, left: 50 }
const BRUSH_HEIGHT = 40
const MIN_ZOOM_DURATION = 1000 // Minimum 1 second zoom window

/**
 * TimelineNavigator Component
 *
 * A high-performance, interactive timeline visualization that shows:
 * - Log density over time with color-coded severity levels
 * - Time selection capabilities with brush interaction
 * - Zoom controls and navigation
 * - Jump-to-time functionality
 */
export default function TimelineNavigator({ height = 200, className = "" }: Partial<TimelineNavigatorProps>) {
  const dispatch = useDispatch()
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<d3.BrushBehavior<unknown>>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height })
  const [localTimeRange, setLocalTimeRange] = useState<TimeSelection | null>(null)

  // Get data from Redux
  const logs = useSelector((state: RootState) => Object.values(state.logs.entries))
  const timeRange = useSelector((state: RootState) => state.timeline.selection)
  const zoomLevel = useSelector((state: RootState) => state.timeline.zoomLevel)
  const filters = useSelector((state: RootState) => state.filters.filters)
  const timeZone = useSelector((state: RootState) => state.ui.timeZone)

  /**
   * Memoized calculation of aggregated timeline data
   * This is a critical performance optimization for large datasets
   */
  const aggregatedData: AggregatedTimelineData = useMemo(() => {
    // Return empty data if no logs
    if (!logs.length) {
      return {
        points: [],
        maxCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        totalLogs: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        debugCount: 0,
      }
    }

    // Get global time range from logs
    const sortedTimestamps = logs.map((log) => log.timestamp).sort((a, b) => a.getTime() - b.getTime())
    const startTime = sortedTimestamps[0]
    const endTime = sortedTimestamps[sortedTimestamps.length - 1]

    // Determine bucket size based on zoom level
    let bucketSizeMs: number

    switch (zoomLevel) {
      case "second":
        bucketSizeMs = 1000 // 1 second
        break
      case "minute":
        bucketSizeMs = 60 * 1000 // 1 minute
        break
      case "hour":
        bucketSizeMs = 60 * 60 * 1000 // 1 hour
        break
      case "day":
        bucketSizeMs = 24 * 60 * 60 * 1000 // 1 day
        break
      default:
        bucketSizeMs = 60 * 1000 // Default: 1 minute
    }

    // Calculate total time span
    const timeSpanMs = endTime.getTime() - startTime.getTime()

    // Adjust bucket size to ensure we don't create too many buckets
    // This prevents performance issues with very large time spans
    const maxBuckets = 1000
    if (timeSpanMs / bucketSizeMs > maxBuckets) {
      bucketSizeMs = Math.ceil(timeSpanMs / maxBuckets)
    }

    // Create bucketed data
    const buckets: Record<number, TimelineDataPoint> = {}

    // Initialize counters
    let errorCount = 0
    let warningCount = 0
    let infoCount = 0
    let debugCount = 0

    // Filter logs based on current filters
    const filteredLogs = logs.filter((log) => {
      // Apply all enabled filters
      for (const filter of filters) {
        if (!filter.enabled) continue

        // Skip saved filters (they are composites)
        if (filter.type === "saved") continue

        switch (filter.type) {
          case "logLevel":
            if (log.level && !filter.levels.includes(log.level)) return false
            break
          case "source":
            if (log.source && !filter.sources.includes(log.source)) return false
            break
          case "text":
            const text = filter.text
            if (filter.caseSensitive) {
              const matches = filter.fields.some((field) => log[field as keyof typeof log]?.toString().includes(text))
              if (!matches) return false
            } else {
              const textLower = text.toLowerCase()
              const matches = filter.fields.some((field) =>
                log[field as keyof typeof log]?.toString().toLowerCase().includes(textLower),
              )
              if (!matches) return false
            }
            break
          case "regex":
            try {
              const regex = new RegExp(filter.pattern, filter.flags)
              const matches = filter.fields.some((field) =>
                regex.test(log[field as keyof typeof log]?.toString() || ""),
              )
              if (!matches) return false
            } catch (e) {
              // If regex is invalid, ignore this filter
              console.error("Invalid regex in filter:", e)
            }
            break
        }
      }

      return true
    })

    // Bin the data into time buckets
    filteredLogs.forEach((log) => {
      const timestamp = log.timestamp
      const bucketTime = Math.floor(timestamp.getTime() / bucketSizeMs) * bucketSizeMs

      if (!buckets[bucketTime]) {
        buckets[bucketTime] = {
          timestamp: new Date(bucketTime),
          count: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          debugCount: 0,
          sources: new Set(),
        }
      }

      // Update overall counts
      buckets[bucketTime].count++
      if (log.source) {
        buckets[bucketTime].sources.add(log.source)
      }

      // Update level-specific counts
      if (log.level) {
        const level = log.level.toUpperCase()
        if (level.includes("ERROR") || level.includes("FATAL") || level.includes("CRITICAL")) {
          buckets[bucketTime].errorCount++
          errorCount++
        } else if (level.includes("WARN")) {
          buckets[bucketTime].warningCount++
          warningCount++
        } else if (level.includes("INFO")) {
          buckets[bucketTime].infoCount++
          infoCount++
        } else if (level.includes("DEBUG") || level.includes("TRACE")) {
          buckets[bucketTime].debugCount++
          debugCount++
        }
      }
    })

    // Convert buckets to sorted array
    const points = Object.values(buckets).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Find maximum count for scaling
    const maxCount = Math.max(...points.map((p) => p.count), 1)

    return {
      points,
      maxCount,
      startTime,
      endTime,
      totalLogs: filteredLogs.length,
      errorCount,
      warningCount,
      infoCount,
      debugCount,
    }
  }, [logs, zoomLevel, filters])

  /**
   * Effect to resize the timeline based on container size
   */
  useEffect(() => {
    if (!svgRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width } = entries[0].contentRect
        setDimensions((prev) => ({ ...prev, width }))
      }
    })

    resizeObserver.observe(svgRef.current.parentElement!)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  /**
   * Create the initial time selection if not already set
   */
  useEffect(() => {
    if (!timeRange && aggregatedData.points.length > 0) {
      dispatch(
        setTimeSelection({
          start: aggregatedData.startTime,
          end: aggregatedData.endTime,
        }),
      )
    }
  }, [timeRange, aggregatedData, dispatch])

  /**
   * Handler for time selection change (debounced to prevent excessive updates)
   */
  const handleTimeSelectionChange = useCallback(
    debounce((selection: TimeSelection) => {
      dispatch(setTimeSelection(selection))
    }, 150),
    [dispatch],
  )

  /**
   * Handle brush end event to update time selection
   */
  const handleBrushEnd = useCallback(
    (event: d3.D3BrushEvent<unknown>) => {
      if (!event.selection) return

      const [x1, x2] = event.selection as [number, number]
      const xScale = d3
        .scaleTime()
        .domain([aggregatedData.startTime, aggregatedData.endTime])
        .range([MARGIN.left, dimensions.width - MARGIN.right])

      const startDate = xScale.invert(x1)
      const endDate = xScale.invert(x2)

      // Only update if selection is big enough
      const selectionDuration = endDate.getTime() - startDate.getTime()
      if (selectionDuration < MIN_ZOOM_DURATION) {
        // If selection is too small, consider it a click
        const clickTime = new Date((startDate.getTime() + endDate.getTime()) / 2)
        dispatch(setJumpToTimestamp(clickTime))
        return
      }

      setLocalTimeRange({ start: startDate, end: endDate })
      handleTimeSelectionChange({ start: startDate, end: endDate })
    },
    [aggregatedData.startTime, aggregatedData.endTime, dimensions.width, handleTimeSelectionChange, dispatch],
  )

  /**
   * Render the timeline visualization using D3
   */
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || aggregatedData.points.length === 0) return

    const svg = d3.select(svgRef.current)

    // Clear previous elements
    svg.selectAll("*").remove()

    // Define dimensions
    const innerHeight = dimensions.height - MARGIN.top - MARGIN.bottom - BRUSH_HEIGHT

    // Define scales
    const xScale = d3
      .scaleTime()
      .domain([aggregatedData.startTime, aggregatedData.endTime])
      .range([MARGIN.left, dimensions.width - MARGIN.right])

    const yScale = d3
      .scaleLinear()
      .domain([0, aggregatedData.maxCount])
      .range([innerHeight + MARGIN.top, MARGIN.top])

    // Add x-axis
    const xAxis = d3.axisBottom(xScale)
    svg
      .append("g")
      .attr("transform", `translate(0,${innerHeight + MARGIN.top})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px")

    // Add y-axis
    const yAxis = d3.axisLeft(yScale)
    svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "10px")

    // Add bars for each data point
    svg
      .selectAll(".log-bar")
      .data(aggregatedData.points)
      .enter()
      .append("g")
      .attr("class", "log-bar")
      .each(function (d, i) {
        const barWidth = Math.max(2, (dimensions.width - MARGIN.left - MARGIN.right) / aggregatedData.points.length - 1)

        const x = xScale(d.timestamp)
        const g = d3.select(this)

        // Create the stacked bars
        const y0 = yScale(0)
        const y1 = yScale(d.errorCount)
        const y2 = yScale(d.errorCount + d.warningCount)
        const y3 = yScale(d.errorCount + d.warningCount + d.infoCount)
        const y4 = yScale(d.errorCount + d.warningCount + d.infoCount + d.debugCount)

        // Error (red)
        if (d.errorCount > 0) {
          g.append("rect")
            .attr("x", x - barWidth / 2)
            .attr("y", y1)
            .attr("width", barWidth)
            .attr("height", y0 - y1)
            .attr("fill", "#DC2626") // Red
        }

        // Warning (amber)
        if (d.warningCount > 0) {
          g.append("rect")
            .attr("x", x - barWidth / 2)
            .attr("y", y2)
            .attr("width", barWidth)
            .attr("height", y1 - y2)
            .attr("fill", "#D97706") // Amber
        }

        // Info (blue)
        if (d.infoCount > 0) {
          g.append("rect")
            .attr("x", x - barWidth / 2)
            .attr("y", y3)
            .attr("width", barWidth)
            .attr("height", y2 - y3)
            .attr("fill", "#0891B2") // Cyan
        }

        // Debug (teal)
        if (d.debugCount > 0) {
          g.append("rect")
            .attr("x", x - barWidth / 2)
            .attr("y", y4)
            .attr("width", barWidth)
            .attr("height", y3 - y4)
            .attr("fill", "#0D9488") // Teal
        }
      })

    // Create a highlight for the current selection
    if (timeRange) {
      const selectionStart = xScale(timeRange.start)
      const selectionEnd = xScale(timeRange.end)

      svg
        .append("rect")
        .attr("class", "selection-highlight")
        .attr("x", selectionStart)
        .attr("y", MARGIN.top)
        .attr("width", selectionEnd - selectionStart)
        .attr("height", innerHeight)
        .attr("fill", "rgba(3, 105, 161, 0.1)")
        .attr("stroke", "rgba(3, 105, 161, 0.5)")
        .attr("stroke-width", 1)
    }

    // Add brushing for time selection
    const brush = d3
      .brushX()
      .extent([
        [MARGIN.left, MARGIN.top + innerHeight + 5],
        [dimensions.width - MARGIN.right, MARGIN.top + innerHeight + BRUSH_HEIGHT],
      ])
      .on("end", handleBrushEnd)

    // Store brush for later access
    brushRef.current = brush

    // Add minimap timeline at the bottom
    svg.append("g").attr("class", "brush-container").call(brush)

    // Add minimap bars
    svg
      .selectAll(".minimap-bar")
      .data(aggregatedData.points)
      .enter()
      .append("rect")
      .attr("class", "minimap-bar")
      .attr("x", (d) => xScale(d.timestamp) - 1)
      .attr("y", MARGIN.top + innerHeight + 5)
      .attr("width", 2)
      .attr("height", BRUSH_HEIGHT)
      .attr("fill", (d) => {
        if (d.errorCount > 0) return "rgba(220, 38, 38, 0.8)" // Red with opacity
        if (d.warningCount > 0) return "rgba(217, 119, 6, 0.8)" // Amber with opacity
        if (d.infoCount > 0) return "rgba(8, 145, 178, 0.8)" // Cyan with opacity
        return "rgba(13, 148, 136, 0.8)" // Teal with opacity
      })

    // Initialize the brush position if we have a time range
    if (timeRange && brushRef.current) {
      const brushStart = xScale(timeRange.start)
      const brushEnd = xScale(timeRange.end)

      // Set the brush selection programmatically
      svg.select(".brush-container").call(brushRef.current.move, [brushStart, brushEnd])
    }

    // Add tooltips for hovering over bars
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "timeline-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)")
      .style("z-index", "1000")

    // Add hover events for tooltips
    svg
      .selectAll(".log-bar")
      .on("mouseover", (event, d) => {
        const formatTime = (date: Date) => formatTimestamp(date.toISOString(), timeZone, "datetime")

        tooltip.style("visibility", "visible").html(`
            <div>
              <div><strong>Time:</strong> ${formatTime(d.timestamp)}</div>
              <div><strong>Total Logs:</strong> ${d.count}</div>
              <div style="color:#DC2626"><strong>Errors:</strong> ${d.errorCount}</div>
              <div style="color:#D97706"><strong>Warnings:</strong> ${d.warningCount}</div>
              <div style="color:#0891B2"><strong>Info:</strong> ${d.infoCount}</div>
              <div style="color:#0D9488"><strong>Debug:</strong> ${d.debugCount}</div>
              <div><strong>Sources:</strong> ${d.sources.size}</div>
            </div>
          `)
      })
      .on("mousemove", (event) => {
        tooltip.style("top", event.pageY - 10 + "px").style("left", event.pageX + 10 + "px")
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden")
      })

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove()
    }
  }, [dimensions, aggregatedData, timeRange, handleBrushEnd, timeZone])

  /**
   * Handle zoom level change
   */
  const handleZoomLevelChange = (value: string) => {
    dispatch(setZoomLevel(value as TimelineZoomLevel))
  }

  /**
   * Handle zoom in/out actions
   */
  const handleZoomIn = () => {
    if (!timeRange) return

    const center = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2)
    const halfDuration = (timeRange.end.getTime() - timeRange.start.getTime()) / 4

    const newStart = new Date(center.getTime() - halfDuration)
    const newEnd = new Date(center.getTime() + halfDuration)

    dispatch(setTimeSelection({ start: newStart, end: newEnd }))
  }

  const handleZoomOut = () => {
    if (!timeRange) return

    const center = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2)
    const halfDuration = timeRange.end.getTime() - timeRange.start.getTime()

    const newStart = new Date(center.getTime() - halfDuration)
    const newEnd = new Date(center.getTime() + halfDuration)

    dispatch(setTimeSelection({ start: newStart, end: newEnd }))
  }

  /**
   * Handle reset to view all logs
   */
  const handleReset = () => {
    if (aggregatedData.points.length === 0) return

    dispatch(
      setTimeSelection({
        start: aggregatedData.startTime,
        end: aggregatedData.endTime,
      }),
    )
  }

  /**
   * Handle navigation left/right
   */
  const handleNavigateLeft = () => {
    if (!timeRange) return

    const duration = timeRange.end.getTime() - timeRange.start.getTime()
    const moveAmount = duration * 0.5

    const newStart = new Date(timeRange.start.getTime() - moveAmount)
    const newEnd = new Date(timeRange.end.getTime() - moveAmount)

    dispatch(setTimeSelection({ start: newStart, end: newEnd }))
  }

  const handleNavigateRight = () => {
    if (!timeRange) return

    const duration = timeRange.end.getTime() - timeRange.start.getTime()
    const moveAmount = duration * 0.5

    const newStart = new Date(timeRange.start.getTime() + moveAmount)
    const newEnd = new Date(timeRange.end.getTime() + moveAmount)

    dispatch(setTimeSelection({ start: newStart, end: newEnd }))
  }

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Top control panel */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Select value={zoomLevel} onValueChange={handleZoomLevelChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Zoom Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="second">Second</SelectItem>
              <SelectItem value="minute">Minute</SelectItem>
              <SelectItem value="hour">Hour</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={aggregatedData.points.length === 0}
            aria-label="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={aggregatedData.points.length === 0}
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            disabled={aggregatedData.points.length === 0}
            aria-label="Reset View"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleNavigateLeft}
            disabled={aggregatedData.points.length === 0}
            aria-label="Navigate Left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNavigateRight}
            disabled={aggregatedData.points.length === 0}
            aria-label="Navigate Right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="relative w-full border rounded-md overflow-hidden bg-white" style={{ height: dimensions.height }}>
        {aggregatedData.points.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">No log data available</div>
        ) : (
          <svg ref={svgRef} width="100%" height={dimensions.height} className="timeline-svg" />
        )}
      </div>

      {/* Timeline stats */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        <div>Total: {aggregatedData.totalLogs} logs</div>
        <div className="flex space-x-3">
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 mr-1 bg-red-600 rounded-sm"></span>
            Errors: {aggregatedData.errorCount}
          </span>
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 mr-1 bg-amber-600 rounded-sm"></span>
            Warnings: {aggregatedData.warningCount}
          </span>
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 mr-1 bg-cyan-600 rounded-sm"></span>
            Info: {aggregatedData.infoCount}
          </span>
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 mr-1 bg-teal-600 rounded-sm"></span>
            Debug: {aggregatedData.debugCount}
          </span>
        </div>
        {timeRange && (
          <div>
            Selected: {formatTimestamp(timeRange.start.toISOString(), timeZone, "datetime")} -{" "}
            {formatTimestamp(timeRange.end.toISOString(), timeZone, "time")}
          </div>
        )}
      </div>
    </div>
  )
}
