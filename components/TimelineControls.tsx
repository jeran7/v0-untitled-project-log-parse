"use client"

import { useState, useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { setTimeRange } from "@/lib/slices/logsSlice"
import { setTimeZone, setViewMode } from "@/lib/slices/uiSlice"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCw } from "lucide-react"

export default function TimelineControls() {
  const dispatch = useDispatch()
  const hasInitialized = useRef(false)
  const isUpdatingTimeRange = useRef(false)

  // Get data from Redux store
  const logEntries = useSelector((state: RootState) => state.logs.entries)
  const selectedFileIds = useSelector((state: RootState) => state.files.selectedFileIds)
  const timeRange = useSelector((state: RootState) => state.logs.timeRange)
  const timeZone = useSelector((state: RootState) => state.ui.timeZone)
  const viewMode = useSelector((state: RootState) => state.ui.viewMode)

  // Local state for timeline controls
  const [zoomLevel, setZoomLevel] = useState(100)
  const [position, setPosition] = useState(0)

  // Calculate global time range from all logs
  const [globalStartTime, setGlobalStartTime] = useState<Date | null>(null)
  const [globalEndTime, setGlobalEndTime] = useState<Date | null>(null)

  // Update global time range when logs change
  useEffect(() => {
    if (Object.keys(logEntries).length > 0) {
      const timestamps = Object.values(logEntries)
        .filter((log) => selectedFileIds.includes(log.fileId))
        .map((log) => log.timestamp)
        .filter((timestamp): timestamp is Date => timestamp instanceof Date)

      if (timestamps.length > 0) {
        const startTime = new Date(Math.min(...timestamps.map((d) => d.getTime())))
        const endTime = new Date(Math.max(...timestamps.map((d) => d.getTime())))

        setGlobalStartTime(startTime)
        setGlobalEndTime(endTime)

        // Set initial time range if not already set and only once
        if (!timeRange && !hasInitialized.current && !isUpdatingTimeRange.current) {
          hasInitialized.current = true
          isUpdatingTimeRange.current = true

          // Use setTimeout to break potential update cycles
          setTimeout(() => {
            dispatch(setTimeRange({ start: startTime, end: endTime }))
            isUpdatingTimeRange.current = false
          }, 0)
        }
      }
    }
  }, [logEntries, selectedFileIds, dispatch, timeRange])

  // Handle zoom level change
  const handleZoomChange = (newZoomLevel: number[]) => {
    setZoomLevel(newZoomLevel[0])
    updateTimeRange(newZoomLevel[0], position)
  }

  // Handle position change
  const handlePositionChange = (newPosition: number[]) => {
    setPosition(newPosition[0])
    updateTimeRange(zoomLevel, newPosition[0])
  }

  // Update time range based on zoom and position
  const updateTimeRange = (zoom: number, pos: number) => {
    if (!globalStartTime || !globalEndTime || isUpdatingTimeRange.current) return

    isUpdatingTimeRange.current = true

    const globalRange = globalEndTime.getTime() - globalStartTime.getTime()
    const visibleRange = globalRange * (100 / zoom)
    const midpoint = globalStartTime.getTime() + globalRange * (pos / 100)

    const start = new Date(midpoint - visibleRange / 2)
    const end = new Date(midpoint + visibleRange / 2)

    // Clamp to global range
    const clampedStart = new Date(Math.max(start.getTime(), globalStartTime.getTime()))
    const clampedEnd = new Date(Math.min(end.getTime(), globalEndTime.getTime()))

    // Use setTimeout to break potential update cycles
    setTimeout(() => {
      dispatch(setTimeRange({ start: clampedStart, end: clampedEnd }))
      isUpdatingTimeRange.current = false
    }, 0)
  }

  // Handle time zone change
  const handleTimeZoneChange = (value: string) => {
    dispatch(setTimeZone(value))
  }

  // Handle view mode change
  const handleViewModeChange = (value: string) => {
    dispatch(setViewMode(value as any))
  }

  // Move timeline left/right
  const moveTimeline = (direction: "left" | "right") => {
    if (isUpdatingTimeRange.current) return

    const step = 10
    const newPosition = direction === "left" ? Math.max(0, position - step) : Math.min(100, position + step)

    setPosition(newPosition)
    updateTimeRange(zoomLevel, newPosition)
  }

  // Zoom in/out
  const zoom = (direction: "in" | "out") => {
    if (isUpdatingTimeRange.current) return

    const step = 10
    const newZoomLevel = direction === "in" ? Math.min(200, zoomLevel + step) : Math.max(50, zoomLevel - step)

    setZoomLevel(newZoomLevel)
    updateTimeRange(newZoomLevel, position)
  }

  // Reset timeline
  const resetTimeline = () => {
    if (isUpdatingTimeRange.current || !globalStartTime || !globalEndTime) return

    setZoomLevel(100)
    setPosition(50)

    isUpdatingTimeRange.current = true

    // Use setTimeout to break potential update cycles
    setTimeout(() => {
      dispatch(setTimeRange({ start: globalStartTime, end: globalEndTime }))
      isUpdatingTimeRange.current = false
    }, 0)
  }

  // Safe format timestamp function
  const safeFormatTimestamp = (timestamp: Date | null | undefined) => {
    if (!timestamp) return "--"
    try {
      return formatTimestamp(timestamp.toISOString(), timeZone, "datetime")
    } catch (error) {
      return "--"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Timeline</h3>

        <div className="flex items-center gap-2">
          <Select value={timeZone} onValueChange={handleTimeZoneChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={handleViewModeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="correlated">Correlated</SelectItem>
              <SelectItem value="split">Split View</SelectItem>
              <SelectItem value="single">Single File</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between text-sm">
          <div>{timeRange ? <span>{safeFormatTimestamp(timeRange.start)}</span> : <span>--</span>}</div>
          <div>{timeRange ? <span>{safeFormatTimestamp(timeRange.end)}</span> : <span>--</span>}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => moveTimeline("left")} disabled={!globalStartTime}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <Slider
              value={[position]}
              min={0}
              max={100}
              step={1}
              onValueChange={handlePositionChange}
              disabled={!globalStartTime}
            />
          </div>

          <Button variant="outline" size="icon" onClick={() => moveTimeline("right")} disabled={!globalEndTime}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => zoom("out")}
            disabled={!globalStartTime || zoomLevel <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <div className="w-20 text-center text-sm">{zoomLevel}%</div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => zoom("in")}
            disabled={!globalEndTime || zoomLevel >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon" onClick={resetTimeline} disabled={!globalStartTime || !globalEndTime}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
