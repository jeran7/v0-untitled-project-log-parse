import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { TimeSelection, TimelineZoomLevel } from "@/types/timeline"

interface TimelineState {
  // Current time range selection
  selection: TimeSelection | null
  // Current zoom level for visualization
  zoomLevel: TimelineZoomLevel
  // Whether real-time updates are enabled
  liveUpdate: boolean
  // Whether timeline is in the process of being dragged
  isDragging: boolean
  // Last clicked timestamp for jump-to functionality
  jumpToTimestamp: Date | null
  // Visible time window (may be larger than selection)
  visibleTimeWindow: TimeSelection | null
}

const initialState: TimelineState = {
  selection: null,
  zoomLevel: "minute" as TimelineZoomLevel,
  liveUpdate: false,
  isDragging: false,
  jumpToTimestamp: null,
  visibleTimeWindow: null,
}

const timelineSlice = createSlice({
  name: "timeline",
  initialState,
  reducers: {
    // Set the selected time range
    setTimeSelection: (state, action: PayloadAction<TimeSelection | null>) => {
      state.selection = action.payload
    },

    // Set the zoom level for the timeline
    setZoomLevel: (state, action: PayloadAction<TimelineZoomLevel>) => {
      state.zoomLevel = action.payload
    },

    // Toggle live update mode
    setLiveUpdate: (state, action: PayloadAction<boolean>) => {
      state.liveUpdate = action.payload

      // If enabling live update, clear selection
      if (action.payload) {
        state.selection = null
      }
    },

    // Set the dragging state
    setIsDragging: (state, action: PayloadAction<boolean>) => {
      state.isDragging = action.payload
    },

    // Set timestamp to jump to
    setJumpToTimestamp: (state, action: PayloadAction<Date | null>) => {
      state.jumpToTimestamp = action.payload
    },

    // Update visible time window
    setVisibleTimeWindow: (state, action: PayloadAction<TimeSelection | null>) => {
      state.visibleTimeWindow = action.payload
    },

    // Reset timeline state
    resetTimeline: (state) => {
      return initialState
    },
  },
})

export const {
  setTimeSelection,
  setZoomLevel,
  setLiveUpdate,
  setIsDragging,
  setJumpToTimestamp,
  setVisibleTimeWindow,
  resetTimeline,
} = timelineSlice.actions

export default timelineSlice.reducer
