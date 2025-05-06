import { configureStore } from "@reduxjs/toolkit"
import filesReducer from "@/lib/slices/filesSlice"
import logsReducer from "@/lib/slices/logsSlice"
import uiReducer from "@/lib/slices/uiSlice"
import timelineReducer from "@/lib/slices/timelineSlice"
import filtersReducer from "@/lib/slices/filtersSlice"
import analysisReducer from "@/lib/slices/analysisSlice"

export const store = configureStore({
  reducer: {
    files: filesReducer,
    logs: logsReducer,
    ui: uiReducer,
    timeline: timelineReducer,
    filters: filtersReducer,
    analysis: analysisReducer,
  },
  // Increase the maximum size limit for actions to handle large log data
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific action types
        ignoredActions: [
          "files/fileProcessed",
          "logs/logsIndexed",
          "timeline/setTimeSelection",
          "timeline/setJumpToTimestamp",
          "timeline/setVisibleTimeWindow",
          "filters/addFilter",
          "filters/updateFilter",
          "filters/setFilters",
          "filters/saveFilterPreset",
          "filters/applyFilterPreset",
          "analysis/setTimeSeriesData",
          "analysis/addDetectedPattern",
          "analysis/addInsight",
        ],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
