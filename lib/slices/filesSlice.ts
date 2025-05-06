import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { FileMetadata } from "@/types/files"

interface FilesState {
  files: Record<string, FileMetadata>
  processingStatus: Record<string, "idle" | "processing" | "completed" | "error">
  processingProgress: Record<string, number>
  processingError: Record<string, string | null>
  selectedFileIds: string[]
}

const initialState: FilesState = {
  files: {},
  processingStatus: {},
  processingProgress: {},
  processingError: {},
  selectedFileIds: [],
}

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    fileAdded: (state, action: PayloadAction<FileMetadata>) => {
      state.files[action.payload.id] = action.payload
      state.processingStatus[action.payload.id] = "idle"
      state.processingProgress[action.payload.id] = 0
      state.processingError[action.payload.id] = null
    },
    fileProcessingStarted: (state, action: PayloadAction<string>) => {
      state.processingStatus[action.payload] = "processing"
      state.processingProgress[action.payload] = 0
    },
    fileProcessingProgress: (state, action: PayloadAction<{ fileId: string; progress: number }>) => {
      state.processingProgress[action.payload.fileId] = action.payload.progress
    },
    fileProcessingCompleted: (state, action: PayloadAction<{ fileId: string; metadata: Partial<FileMetadata> }>) => {
      const { fileId, metadata } = action.payload
      state.processingStatus[fileId] = "completed"
      state.files[fileId] = { ...state.files[fileId], ...metadata }
    },
    fileProcessingError: (state, action: PayloadAction<{ fileId: string; error: string }>) => {
      state.processingStatus[action.payload.fileId] = "error"
      state.processingError[action.payload.fileId] = action.payload.error
    },
    selectFile: (state, action: PayloadAction<string>) => {
      state.selectedFileIds.push(action.payload)
    },
    deselectFile: (state, action: PayloadAction<string>) => {
      state.selectedFileIds = state.selectedFileIds.filter((id) => id !== action.payload)
    },
    deleteFile: (state, action: PayloadAction<string>) => {
      delete state.files[action.payload]
      delete state.processingStatus[action.payload]
      delete state.processingProgress[action.payload]
      delete state.processingError[action.payload]
      state.selectedFileIds = state.selectedFileIds.filter((id) => id !== action.payload)
    },
    processFile: (state, action: PayloadAction<File>) => {
      // This is a thunk action, so it doesn't directly modify the state here.
      // The actual state updates are handled by the other reducers in this slice.
    },
    clearFiles: (state) => {
      state.files = {}
      state.processingStatus = {}
      state.processingProgress = {}
      state.processingError = {}
      state.selectedFileIds = []
    },
  },
})

export const {
  fileAdded,
  fileProcessingStarted,
  fileProcessingProgress,
  fileProcessingCompleted,
  fileProcessingError,
  selectFile,
  deselectFile,
  deleteFile,
  processFile,
  clearFiles,
} = filesSlice.actions

export default filesSlice.reducer
