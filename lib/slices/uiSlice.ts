import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface UiState {
  fileUploadModalOpen: boolean
  fullscreenMode: boolean
  isSidebarOpen: boolean
  activeTab: string
  theme: "light" | "dark" | "system"
  timeZone: string
  viewMode: "split" | "single" | "correlated"
  // Add other UI state as needed
}

const initialState: UiState = {
  fileUploadModalOpen: false,
  fullscreenMode: false,
  isSidebarOpen: true,
  activeTab: "logs",
  theme: "system",
  timeZone: "UTC",
  viewMode: "correlated",
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setFileUploadModalOpen: (state, action: PayloadAction<boolean>) => {
      state.fileUploadModalOpen = action.payload
    },
    setFullscreenMode: (state, action: PayloadAction<boolean>) => {
      state.fullscreenMode = action.payload
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload
    },
    setTheme: (state, action: PayloadAction<UiState["theme"]>) => {
      state.theme = action.payload
    },
    setTimeZone: (state, action: PayloadAction<string>) => {
      state.timeZone = action.payload
    },
    setViewMode: (state, action: PayloadAction<UiState["viewMode"]>) => {
      state.viewMode = action.payload
    },
  },
})

export const {
  setFileUploadModalOpen,
  setFullscreenMode,
  setSidebarOpen,
  setActiveTab,
  setTheme,
  setTimeZone,
  setViewMode,
} = uiSlice.actions

export default uiSlice.reducer
