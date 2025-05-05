"use client"

import { useState, useCallback } from "react"
import type { SyncScrollState } from "../types"
import type { LogEntry } from "@/types/logs"

/**
 * Hook for managing synchronized scrolling between multiple log viewers
 *
 * @returns Object containing sync state and handlers
 */
export function useSynchronizedScroll(logs: LogEntry[]) {
  // State for synchronized scrolling
  const [syncScrollState, setSyncScrollState] = useState<SyncScrollState>({
    timestamp: null,
    sourceFileId: null,
    isScrolling: false,
  })

  // Handler for synchronized scrolling
  const handleSyncScroll = useCallback((timestamp: Date, sourceFileId: string) => {
    setSyncScrollState({
      timestamp,
      sourceFileId,
      isScrolling: true,
    })

    // Reset isScrolling after a short delay
    setTimeout(() => {
      setSyncScrollState((prev) => ({
        ...prev,
        isScrolling: false,
      }))
    }, 100)
  }, [])

  // Find the index of a log entry with the closest timestamp
  const findTimestampIndex = useCallback((logs: LogEntry[], timestamp: Date): number => {
    if (logs.length === 0) return -1

    // Binary search for the closest timestamp
    let left = 0
    let right = logs.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const midTimestamp = logs[mid].timestamp

      if (midTimestamp.getTime() === timestamp.getTime()) {
        return mid
      }

      if (midTimestamp.getTime() < timestamp.getTime()) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    // If we didn't find an exact match, return the closest index
    if (left >= logs.length) return logs.length - 1
    if (left <= 0) return 0

    // Determine which is closer: left or left-1
    const leftDiff = Math.abs(logs[left].timestamp.getTime() - timestamp.getTime())
    const rightDiff = Math.abs(logs[left - 1].timestamp.getTime() - timestamp.getTime())

    return leftDiff < rightDiff ? left : left - 1
  }, [])

  return {
    syncScrollState,
    setSyncScrollState,
    handleSyncScroll,
    findTimestampIndex,
  }
}
