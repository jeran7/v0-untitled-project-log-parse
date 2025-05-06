import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { LogEntry, LogIndex, TimeRange } from "@/types/logs"
import type { ColumnDefinition } from "@/components/LogViewer/types"

interface LogsState {
  // Normalized log entries by ID
  entries: Record<string, LogEntry>
  // Indexes for efficient lookup
  indexes: {
    byTimestamp: LogIndex
    byFile: Record<string, string[]>
  }
  // Virtual window for displaying logs
  virtualWindow: {
    startIndex: number
    endIndex: number
    totalCount: number
  }
  // Current time range for filtering
  timeRange: TimeRange | null
  // Filters
  filters: {
    search: string
    logLevel: string[]
    source: string[]
  }
  // Column preferences by file ID
  columnPreferences: Record<string, ColumnDefinition[]>
  // Currently active log entry
  activeLogEntry: string | null
  // Removed log entries history for undo (limited buffer)
  removedEntries: {
    entries: Record<string, LogEntry>
    timestamp: number
    description: string
  }[]
  // Count of removed entries
  removedCount: number
}

const initialState: LogsState = {
  entries: {},
  indexes: {
    byTimestamp: {},
    byFile: {},
  },
  virtualWindow: {
    startIndex: 0,
    endIndex: 100,
    totalCount: 0,
  },
  timeRange: null,
  filters: {
    search: "",
    logLevel: [],
    source: [],
  },
  columnPreferences: {},
  activeLogEntry: null,
  removedEntries: [],
  removedCount: 0,
}

// Maximum number of removal operations to keep in history
const MAX_REMOVAL_HISTORY = 10

const logsSlice = createSlice({
  name: "logs",
  initialState,
  reducers: {
    // Add log entries in batches for better performance
    addLogEntries: (state, action: PayloadAction<{ entries: LogEntry[]; fileId: string }>) => {
      const { entries, fileId } = action.payload

      // Add entries to normalized store
      entries.forEach((entry) => {
        // Ensure timestamp is a Date object
        if (typeof entry.timestamp === "string") {
          entry.timestamp = new Date(entry.timestamp)
        }

        state.entries[entry.id] = entry

        // Update timestamp index
        const timestamp = entry.timestamp.getTime()
        if (!state.indexes.byTimestamp[timestamp]) {
          state.indexes.byTimestamp[timestamp] = []
        }
        state.indexes.byTimestamp[timestamp].push(entry.id)

        // Update file index
        if (!state.indexes.byFile[fileId]) {
          state.indexes.byFile[fileId] = []
        }
        state.indexes.byFile[fileId].push(entry.id)
      })

      // Update total count
      state.virtualWindow.totalCount = Object.keys(state.entries).length
    },

    // Update virtual window for efficient rendering
    updateVirtualWindow: (state, action: PayloadAction<{ startIndex: number; endIndex: number }>) => {
      const { startIndex, endIndex } = action.payload
      state.virtualWindow.startIndex = startIndex
      state.virtualWindow.endIndex = endIndex
    },

    // Set time range for filtering
    setTimeRange: (state, action: PayloadAction<TimeRange | null>) => {
      state.timeRange = action.payload
    },

    // Update filters
    updateFilters: (state, action: PayloadAction<Partial<LogsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },

    // Update column preferences for a file
    updateColumnPreferences: (state, action: PayloadAction<{ fileId: string; columns: ColumnDefinition[] }>) => {
      const { fileId, columns } = action.payload
      state.columnPreferences[fileId] = columns
    },

    // Set active log entry
    setActiveLogEntry: (state, action: PayloadAction<string | null>) => {
      state.activeLogEntry = action.payload
    },

    // Remove log entries by IDs
    removeLogEntries: (state, action: PayloadAction<{ ids: string[]; description: string }>) => {
      const { ids, description } = action.payload

      if (ids.length === 0) return

      // Store removed entries for potential undo
      const removedEntries: Record<string, LogEntry> = {}

      ids.forEach((id) => {
        if (state.entries[id]) {
          // Store the entry before removing
          removedEntries[id] = state.entries[id]

          // Remove from timestamp index
          const timestamp = state.entries[id].timestamp.getTime()
          if (state.indexes.byTimestamp[timestamp]) {
            state.indexes.byTimestamp[timestamp] = state.indexes.byTimestamp[timestamp].filter(
              (entryId) => entryId !== id,
            )

            // Clean up empty arrays
            if (state.indexes.byTimestamp[timestamp].length === 0) {
              delete state.indexes.byTimestamp[timestamp]
            }
          }

          // Remove from file index
          const fileId = state.entries[id].fileId
          if (state.indexes.byFile[fileId]) {
            state.indexes.byFile[fileId] = state.indexes.byFile[fileId].filter((entryId) => entryId !== id)

            // Clean up empty arrays
            if (state.indexes.byFile[fileId].length === 0) {
              delete state.indexes.byFile[fileId]
            }
          }

          // Remove the entry itself
          delete state.entries[id]
        }
      })

      // Add to removal history if there are actual removals
      if (Object.keys(removedEntries).length > 0) {
        state.removedEntries.push({
          entries: removedEntries,
          timestamp: Date.now(),
          description,
        })

        // Limit history size
        if (state.removedEntries.length > MAX_REMOVAL_HISTORY) {
          state.removedEntries.shift()
        }

        // Update removed count
        state.removedCount += Object.keys(removedEntries).length

        // Update total count
        state.virtualWindow.totalCount = Object.keys(state.entries).length
      }
    },

    // Remove log entries by filter criteria
    removeLogEntriesByFilter: (
      state,
      action: PayloadAction<{
        filter: {
          text?: string
          regex?: { pattern: string; flags: string }
          logLevel?: string[]
          source?: string[]
          timeRange?: TimeRange
        }
        description: string
      }>,
    ) => {
      const { filter, description } = action.payload
      const idsToRemove: string[] = []

      // Find entries matching the filter
      Object.entries(state.entries).forEach(([id, entry]) => {
        let shouldRemove = true

        // Text filter
        if (filter.text && shouldRemove) {
          const textLower = filter.text.toLowerCase()
          shouldRemove =
            entry.message?.toLowerCase().includes(textLower) || entry.raw?.toLowerCase().includes(textLower)
        }

        // Regex filter
        if (filter.regex && shouldRemove) {
          try {
            const regex = new RegExp(filter.regex.pattern, filter.regex.flags)
            shouldRemove = regex.test(entry.message || "") || regex.test(entry.raw || "")
          } catch (e) {
            shouldRemove = false
          }
        }

        // Log level filter
        if (filter.logLevel && filter.logLevel.length > 0 && shouldRemove) {
          shouldRemove = entry.level ? filter.logLevel.includes(entry.level) : false
        }

        // Source filter
        if (filter.source && filter.source.length > 0 && shouldRemove) {
          shouldRemove = entry.source ? filter.source.includes(entry.source) : false
        }

        // Time range filter
        if (filter.timeRange && shouldRemove) {
          const timestamp = entry.timestamp.getTime()
          shouldRemove = timestamp >= filter.timeRange.start.getTime() && timestamp <= filter.timeRange.end.getTime()
        }

        if (shouldRemove) {
          idsToRemove.push(id)
        }
      })

      // Use the existing removeLogEntries reducer
      if (idsToRemove.length > 0) {
        logsSlice.caseReducers.removeLogEntries(state, {
          type: "logs/removeLogEntries",
          payload: { ids: idsToRemove, description },
        })
      }
    },

    // Undo last removal operation
    undoRemoval: (state) => {
      const lastRemoval = state.removedEntries.pop()

      if (!lastRemoval) return

      // Restore removed entries
      Object.entries(lastRemoval.entries).forEach(([id, entry]) => {
        // Add back to entries
        state.entries[id] = entry

        // Add back to timestamp index
        const timestamp = entry.timestamp.getTime()
        if (!state.indexes.byTimestamp[timestamp]) {
          state.indexes.byTimestamp[timestamp] = []
        }
        state.indexes.byTimestamp[timestamp].push(id)

        // Add back to file index
        const fileId = entry.fileId
        if (!state.indexes.byFile[fileId]) {
          state.indexes.byFile[fileId] = []
        }
        state.indexes.byFile[fileId].push(id)
      })

      // Update removed count
      state.removedCount -= Object.keys(lastRemoval.entries).length

      // Update total count
      state.virtualWindow.totalCount = Object.keys(state.entries).length
    },

    // Clear all logs
    clearLogs: (state) => {
      state.entries = {}
      state.indexes = {
        byTimestamp: {},
        byFile: {},
      }
      state.virtualWindow = {
        startIndex: 0,
        endIndex: 100,
        totalCount: 0,
      }
      state.activeLogEntry = null
      state.removedEntries = []
      state.removedCount = 0
    },
  },
})

export const {
  addLogEntries,
  updateVirtualWindow,
  setTimeRange,
  updateFilters,
  updateColumnPreferences,
  setActiveLogEntry,
  removeLogEntries,
  removeLogEntriesByFilter,
  undoRemoval,
  clearLogs,
} = logsSlice.actions

export default logsSlice.reducer
