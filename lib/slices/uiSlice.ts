import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

// Add fileCleanupModalOpen to the UIState interface
interface UIState {
  sidebarOpen: boolean
  fileUploadModalOpen: boolean
  fileCleanupModalOpen: boolean
  fullscreenMode: boolean
  theme: "light" | "dark" | "system"
  timeZone: string
  viewMode: "correlated" | "split" | "single"
  isFullscreen: boolean
}

// Update the initialState to include fileCleanupModalOpen
const initialState: UIState = {
  sidebarOpen: true,
  fileUploadModalOpen: false,
  fileCleanupModalOpen: false,
  fullscreenMode: false,
  theme: "system",
  timeZone: "UTC",
  viewMode: "correlated",
  isFullscreen: false,
}

// Add the setFileCleanupModalOpen action
export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    setFileUploadModalOpen: (state, action: PayloadAction<boolean>) => {
      state.fileUploadModalOpen = action.payload
    },
    setFileCleanupModalOpen: (state, action: PayloadAction<boolean>) => {
      state.fileCleanupModalOpen = action.payload
    },
    toggleFullscreenMode: (state) => {
      state.fullscreenMode = !state.fullscreenMode
      state.isFullscreen = !state.isFullscreen
    },
    setTheme: (state, action: PayloadAction<"light" | "dark" | "system">) => {
      state.theme = action.payload
    },
    setTimeZone: (state, action: PayloadAction<string>) => {
      state.timeZone = action.payload
    },
    setViewMode: (state, action: PayloadAction<"correlated" | "split" | "single">) => {
      state.viewMode = action.payload
    },
    setIsFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload
    },
  },
})

// Export the new action
export const {
  toggleSidebar,
  setSidebarOpen,
  setFileUploadModalOpen,
  setFileCleanupModalOpen,
  toggleFullscreenMode,
  setTheme,
  setTimeZone,
  setViewMode,
  setIsFullscreen,
} = uiSlice.actions

export default uiSlice.reducer

// Add these lines after the existing exports
export const setUploadModalOpen = setFileUploadModalOpen
export const setCleanupModalOpen = setFileCleanupModalOpen
