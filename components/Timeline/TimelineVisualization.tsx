"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import * as d3 from "d3"
import type { RootState } from "@/lib/store"
import { setTimeSelection } from "@/lib/slices/timelineSlice"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import { ZoomIn, ZoomOut, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { XAGE_COLORS } from "@/components/LogViewer/constants"

// Constants for timeline visualization
const MARGIN = { top: 20, right: 30, bottom: 30, left: 50 }
const BRUSH_HEIGHT = 40
const TRANSITION_DURATION = 500

export default function TimelineVisualization() {
  const dispatch = useDispatch()
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<d3.BrushBehavior<unknown> | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 200 })
  const [granularity, setGranularity] = useState<"minute" | "hour" | "day">("hour")

  // Get data from Redux store
  const logs = useSelector((state: RootState) => Object.values(state.logs.entries))
  const timeRange = useSelector((state: RootState) => state.timeline.selection)
  const selectedFileIds = useSelector((state: RootState) => state.files.selectedFileIds)
  const timeZone = useSelector((state: RootState) => state.ui.timeZone)

  // Filter logs based on selected files
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => selectedFileIds.includes(log.fileId))
  }, [logs, selectedFileIds])

  // Aggregate data for timeline visualization
  const aggregatedData = useMemo(() => {
    if (filteredLogs.length === 0) {
      return {
        buckets: [],
        startTime: new Date(),
        endTime: new Date(),
        maxCount: 0,
      }
    }

    // Sort logs by timestamp
    const sortedLogs = [...filteredLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    const startTime = sortedLogs[0].timestamp
    const endTime = sortedLogs[sortedLogs.length - 1].timestamp
    const timeSpan = endTime.getTime() - startTime.getTime()

    // Determine bucket size based on granularity and time span
    let bucketSizeMs: number
    switch (granularity) {
      case "minute":
        bucketSizeMs = 60 * 1000 // 1 minute
        break
      case "day":
        bucketSizeMs = 24 * 60 * 60 * 1000 // 1 day
        break
      case "hour":
      default:
        bucketSizeMs = 60 * 60 * 1000 // 1 hour
        break
    }

    // Ensure we don't create too many buckets for performance
    const maxBuckets = 200
    if (timeSpan / bucketSizeMs > maxBuckets) {
      bucketSizeMs = Math.ceil(timeSpan / maxBuckets)
    }

    // Create buckets
    const buckets: Record<
      number,
      {
        timestamp: Date
        count: number
        errorCount: number
        warningCount: number
        infoCount: number
        debugCount: number
      }
    > = {}

    // Fill buckets with log data
    sortedLogs.forEach((log) => {
      const bucketTime = Math.floor(log.timestamp.getTime() / bucketSizeMs) * bucketSizeMs

      if (!buckets[bucketTime]) {
        buckets[bucketTime] = {
          timestamp: new Date(bucketTime),
          count: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          debugCount: 0,
        }
      }

      buckets[bucketTime].count++

      // Count by log level
      if (log.level) {
        const level = log.level.toUpperCase()
        if (level.includes("ERROR") || level.includes("FATAL") || level.includes("CRITICAL")) {
          buckets[bucketTime].errorCount++
        } else if (level.includes("WARN")) {
          buckets[bucketTime].warningCount++
        } else if (level.includes("INFO")) {
          buckets[bucketTime].infoCount++
        } else if (level.includes("DEBUG") || level.includes("TRACE")) {
          buckets[bucketTime].debugCount++
        }
      }
    })

    // Convert to array and sort
    const bucketArray = Object.values(buckets).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Find maximum count for scaling
    const maxCount = Math.max(...bucketArray.map((b) => b.count), 1)

    return {
      buckets: bucketArray,
      startTime,
      endTime,
      maxCount,
    }
  }, [filteredLogs, granularity])

  // Effect to handle window resizing
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

  // Effect to render the timeline visualization
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || aggregatedData.buckets.length === 0) return

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
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(getTicksForGranularity(granularity))
      .tickFormat((d) => formatTimeForGranularity(d as Date, granularity, timeZone))

    svg
      .append("g")
      .attr("transform", `translate(0,${innerHeight + MARGIN.top})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")

    // Add y-axis
    const yAxis = d3.axisLeft(yScale)
    svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "10px")

    // Add stacked bars for each data point
    svg
      .selectAll(".timeline-bar-group")
      .data(aggregatedData.buckets)
      .enter()
      .append("g")
      .attr("class", "timeline-bar-group")
      .attr("transform", (d) => `translate(${xScale(d.timestamp)},0)`)
      .each(function (d) {
        const g = d3.select(this)
        const barWidth = Math.max(
          2,
          (dimensions.width - MARGIN.left - MARGIN.right) / aggregatedData.buckets.length - 1,
        )

        // Create stacked bars for different log levels
        const y0 = yScale(0)
        const y1 = yScale(d.errorCount)
        const y2 = yScale(d.errorCount + d.warningCount)
        const y3 = yScale(d.errorCount + d.warningCount + d.infoCount)
        const y4 = yScale(d.errorCount + d.warningCount + d.infoCount + d.debugCount)

        // Error (red)
        if (d.errorCount > 0) {
          g.append("rect")
            .attr("x", -barWidth / 2)
            .attr("y", y1)
            .attr("width", barWidth)
            .attr("height", y0 - y1)
            .attr("fill", XAGE_COLORS.error)
            .attr("opacity", 0.8)
        }

        // Warning (amber)
        if (d.warningCount > 0) {
          g.append("rect")
            .attr("x", -barWidth / 2)
            .attr("y", y2)
            .attr("width", barWidth)
            .attr("height", y1 - y2)
            .attr("fill", XAGE_COLORS.warning)
            .attr("opacity", 0.8)
        }

        // Info (blue)
        if (d.infoCount > 0) {
          g.append("rect")
            .attr("x", -barWidth / 2)
            .attr("y", y3)
            .attr("width", barWidth)
            .attr("height", y2 - y3)
            .attr("fill", XAGE_COLORS.info)
            .attr("opacity", 0.8)
        }

        // Debug (teal)
        if (d.debugCount > 0) {
          g.append("rect")
            .attr("x", -barWidth / 2)
            .attr("y", y4)
            .attr("width", barWidth)
            .attr("height", y3 - y4)
            .attr("fill", XAGE_COLORS.debug)
            .attr("opacity", 0.8)
        }
      })

    // Add brush for time selection
    const brush = d3
      .brushX()
      .extent([
        [MARGIN.left, MARGIN.top + innerHeight + 5],
        [dimensions.width - MARGIN.right, MARGIN.top + innerHeight + BRUSH_HEIGHT],
      ])
      .on("end", (event) => {
        if (!event.selection) return

        const [x1, x2] = event.selection as [number, number]
        const startDate = xScale.invert(x1)
        const endDate = xScale.invert(x2)

        // Dispatch time selection action
        dispatch(
          setTimeSelection({
            start: startDate,
            end: endDate,
          }),
        )
      })

    // Store brush for later access
    brushRef.current = brush

    // Add minimap timeline at the bottom
    svg.append("g").attr("class", "brush-container").call(brush)

    // Add minimap bars
    svg
      .selectAll(".minimap-bar")
      .data(aggregatedData.buckets)
      .enter()
      .append("rect")
      .attr("class", "minimap-bar")
      .attr("x", (d) => xScale(d.timestamp) - 1)
      .attr("y", MARGIN.top + innerHeight + 5)
      .attr("width", 2)
      .attr("height", BRUSH_HEIGHT)
      .attr("fill", (d) => {
        if (d.errorCount > 0) return `${XAGE_COLORS.error}CC`
        if (d.warningCount > 0) return `${XAGE_COLORS.warning}CC`
        if (d.infoCount > 0) return `${XAGE_COLORS.info}CC`
        return `${XAGE_COLORS.debug}CC`
      })

    // Initialize the brush position if we have a time range
    if (timeRange && brushRef.current) {
      const brushStart = xScale(timeRange.start)
      const brushEnd = xScale(timeRange.end)

      // Set the brush selection programmatically
      svg
        .select(".brush-container")
        .transition()
        .duration(TRANSITION_DURATION)
        .call(brushRef.current.move, [brushStart, brushEnd])
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
      .selectAll(".timeline-bar-group")
      .on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible").html(`
            <div>
              <div><strong>Time:</strong> ${formatTimestamp(d.timestamp.toISOString(), timeZone, "datetime")}</div>
              <div><strong>Total Logs:</strong> ${d.count}</div>
              <div style="color:${XAGE_COLORS.error}"><strong>Errors:</strong> ${d.errorCount}</div>
              <div style="color:${XAGE_COLORS.warning}"><strong>Warnings:</strong> ${d.warningCount}</div>
              <div style="color:${XAGE_COLORS.info}"><strong>Info:</strong> ${d.infoCount}</div>
              <div style="color:${XAGE_COLORS.debug}"><strong>Debug:</strong> ${d.debugCount}</div>
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
  }, [dimensions, aggregatedData, timeRange, granularity, dispatch, timeZone])

  // Handle granularity change
  const handleGranularityChange = (value: string) => {
    setGranularity(value as "minute" | "hour" | "day")
  }

  // Handle zoom in/out
  const handleZoomIn = () => {
    if (!timeRange) return

    const center = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2)
    const halfDuration = (timeRange.end.getTime() - timeRange.start.getTime()) / 4

    dispatch(
      setTimeSelection({
        start: new Date(center.getTime() - halfDuration),
        end: new Date(center.getTime() + halfDuration),
      }),
    )
  }

  const handleZoomOut = () => {
    if (!timeRange) return

    const center = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2)
    const halfDuration = timeRange.end.getTime() - timeRange.start.getTime()

    dispatch(
      setTimeSelection({
        start: new Date(center.getTime() - halfDuration),
        end: new Date(center.getTime() + halfDuration),
      }),
    )
  }

  // Handle reset to view all logs
  const handleReset = () => {
    if (aggregatedData.buckets.length === 0) return

    dispatch(
      setTimeSelection({
        start: aggregatedData.startTime,
        end: aggregatedData.endTime,
      }),
    )
  }

  // Handle navigation left/right
  const handleNavigateLeft = () => {
    if (!timeRange) return

    const duration = timeRange.end.getTime() - timeRange.start.getTime()
    const moveAmount = duration * 0.5

    dispatch(
      setTimeSelection({
        start: new Date(timeRange.start.getTime() - moveAmount),
        end: new Date(timeRange.end.getTime() - moveAmount),
      }),
    )
  }

  const handleNavigateRight = () => {
    if (!timeRange) return

    const duration = timeRange.end.getTime() - timeRange.start.getTime()
    const moveAmount = duration * 0.5

    dispatch(
      setTimeSelection({
        start: new Date(timeRange.start.getTime() + moveAmount),
        end: new Date(timeRange.end.getTime() - moveAmount),
      }),
    )
  }

  return (
    <div className="flex flex-col w-full">
      {/* Top control panel */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Select value={granularity} onValueChange={handleGranularityChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">Minute</SelectItem>
              <SelectItem value="hour">Hour</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={aggregatedData.buckets.length === 0}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={aggregatedData.buckets.length === 0}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset} disabled={aggregatedData.buckets.length === 0}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleNavigateLeft}
            disabled={aggregatedData.buckets.length === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNavigateRight}
            disabled={aggregatedData.buckets.length === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="relative w-full border rounded-md overflow-hidden bg-white" style={{ height: dimensions.height }}>
        {aggregatedData.buckets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">No log data available</div>
        ) : (
          <svg ref={svgRef} width="100%" height={dimensions.height} />
        )}
      </div>

      {/* Timeline stats */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        <div>Total: {filteredLogs.length} logs</div>
        <div className="flex space-x-3">
          <span className="flex items-center">
            <span
              className="inline-block w-3 h-3 mr-1 rounded-sm"
              style={{ backgroundColor: XAGE_COLORS.error }}
            ></span>
            Errors
          </span>
          <span className="flex items-center">
            <span
              className="inline-block w-3 h-3 mr-1 rounded-sm"
              style={{ backgroundColor: XAGE_COLORS.warning }}
            ></span>
            Warnings
          </span>
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 mr-1 rounded-sm" style={{ backgroundColor: XAGE_COLORS.info }}></span>
            Info
          </span>
          <span className="flex items-center">
            <span
              className="inline-block w-3 h-3 mr-1 rounded-sm"
              style={{ backgroundColor: XAGE_COLORS.debug }}
            ></span>
            Debug
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

// Helper function to get appropriate number of ticks based on granularity
function getTicksForGranularity(granularity: string): number {
  switch (granularity) {
    case "minute":
      return 10
    case "day":
      return 7
    case "hour":
    default:
      return 12
  }
}

// Helper function to format time based on granularity
function formatTimeForGranularity(date: Date, granularity: string, timeZone: string): string {
  switch (granularity) {
    case "minute":
      return formatTimestamp(date.toISOString(), timeZone, "time")
    case "day":
      return formatTimestamp(date.toISOString(), timeZone, "date")
    case "hour":
    default:
      return formatTimestamp(date.toISOString(), timeZone, "datetime")
  }
}
