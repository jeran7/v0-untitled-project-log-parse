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
}

const logsSlice = createSlice({
  name: "logs",
  initialState,
  reducers: {
    // Add log entries in batches for better performance
    addLogEntries: (state, action: PayloadAction<{ entries: LogEntry[]; fileId: string }>) => {
      const { entries, fileId } = action.payload

      // Add entries to normalized store
      entries.forEach((entry) => {
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
  clearLogs,
} = logsSlice.actions

export default logsSlice.reducer
