import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { FileMetadata } from "@/types/files"

interface FilesState {
  files: Record<string, FileMetadata>
  selectedFileId: string | null
  isProcessing: boolean
  error: string | null
  processingStatus: Record<string, "pending" | "processing" | "completed" | "error">
  processingProgress: Record<string, number>
  processingError: Record<string, string | null>
  selectedFileIds: string[]
}

const initialState: FilesState = {
  files: {},
  selectedFileId: null,
  isProcessing: false,
  error: null,
  processingStatus: {},
  processingProgress: {},
  processingError: {},
  selectedFileIds: [],
}

export const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    fileAdded: (state, action: PayloadAction<FileMetadata>) => {
      const file = action.payload
      state.files[file.id] = {
        ...file,
        uploadedAt: new Date().toISOString(),
      }
      state.processingStatus[file.id] = "pending"
      state.processingProgress[file.id] = 0
      state.processingError[file.id] = null
    },
    fileProcessingStarted: (state, action: PayloadAction<string>) => {
      const fileId = action.payload
      state.processingStatus[fileId] = "processing"
      state.processingProgress[fileId] = 0
      state.processingError[fileId] = null
      state.isProcessing = true
    },
    fileProcessingProgress: (state, action: PayloadAction<{ fileId: string; progress: number }>) => {
      const { fileId, progress } = action.payload
      state.processingProgress[fileId] = progress
    },
    fileProcessingCompleted: (
      state,
      action: PayloadAction<{
        fileId: string
        metadata: {
          startTime: Date
          endTime: Date
          logCount: number
          logLevels: string[]
          sources: string[]
        }
      }>,
    ) => {
      const { fileId, metadata } = action.payload
      state.files[fileId] = {
        ...state.files[fileId],
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        logCount: metadata.logCount,
        logLevels: metadata.logLevels,
        sources: metadata.sources,
      }
      state.processingStatus[fileId] = "completed"
      state.processingProgress[fileId] = 100
      state.isProcessing = false
    },
    fileProcessingError: (state, action: PayloadAction<{ fileId: string; error: string }>) => {
      const { fileId, error } = action.payload
      state.processingStatus[fileId] = "error"
      state.processingError[fileId] = error
      state.isProcessing = false
      state.error = error
    },
    deleteFile: (state, action: PayloadAction<string>) => {
      const fileId = action.payload
      delete state.files[fileId]
      delete state.processingStatus[fileId]
      delete state.processingProgress[fileId]
      delete state.processingError[fileId]

      state.selectedFileIds = state.selectedFileIds.filter((id) => id !== fileId)

      if (state.selectedFileId === fileId) {
        state.selectedFileId = null
      }
    },
    selectFile: (state, action: PayloadAction<string>) => {
      state.selectedFileId = action.payload
      if (!state.selectedFileIds.includes(action.payload)) {
        state.selectedFileIds = [action.payload]
      }
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const {
  fileAdded,
  fileProcessingStarted,
  fileProcessingProgress,
  fileProcessingCompleted,
  fileProcessingError,
  deleteFile,
  fileRemoved,
  selectFile,
  clearError,
} = filesSlice.actions

export default filesSlice.reducer
