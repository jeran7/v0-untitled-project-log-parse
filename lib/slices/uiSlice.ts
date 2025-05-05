import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface UiState {
  isFileUploadModalOpen: boolean
  isSidebarOpen: boolean
  activeTab: string
  theme: "light" | "dark" | "system"
  timeZone: string
  viewMode: "split" | "single" | "correlated"
}

const initialState: UiState = {
  isFileUploadModalOpen: false,
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
      state.isFileUploadModalOpen = action.payload
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

export const { setFileUploadModalOpen, setSidebarOpen, setActiveTab, setTheme, setTimeZone, setViewMode } =
  uiSlice.actions

export default uiSlice.reducer
