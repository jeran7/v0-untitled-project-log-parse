import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import type { FileMetadata, ProcessedFile } from "@/types/files"

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

// Async thunk for file processing
export const processFile = createAsyncThunk("files/processFile", async (file: File, { dispatch }) => {
  const fileId = crypto.randomUUID()

  // Create a file metadata object
  const fileMetadata: FileMetadata = {
    id: fileId,
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    totalChunks: Math.ceil(file.size / (5 * 1024 * 1024)), // 5MB chunks
  }

  // Update the store with the file metadata
  dispatch(addFile(fileMetadata))

  // Start processing the file in the background
  const worker = new Worker(new URL("@/workers/fileProcessor.ts", import.meta.url))

  worker.onmessage = (event) => {
    const { type, payload } = event.data

    switch (type) {
      case "PROGRESS":
        dispatch(updateProcessingProgress({ fileId, progress: payload.progress }))
        break
      case "COMPLETED":
        dispatch(fileProcessed({ fileId, processedData: payload.processedData }))
        break
      case "ERROR":
        dispatch(processingError({ fileId, error: payload.error }))
        break
    }
  }

  // Send the file to the worker for processing
  worker.postMessage({ type: "PROCESS_FILE", payload: { file, fileId } })

  return fileMetadata
})

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    addFile: (state, action: PayloadAction<FileMetadata>) => {
      const file = action.payload
      state.files[file.id] = file
      state.processingStatus[file.id] = "idle"
      state.processingProgress[file.id] = 0
      state.processingError[file.id] = null
    },
    updateProcessingProgress: (state, action: PayloadAction<{ fileId: string; progress: number }>) => {
      const { fileId, progress } = action.payload
      state.processingStatus[fileId] = "processing"
      state.processingProgress[fileId] = progress
    },
    fileProcessed: (state, action: PayloadAction<{ fileId: string; processedData: ProcessedFile }>) => {
      const { fileId, processedData } = action.payload
      state.processingStatus[fileId] = "completed"
      state.processingProgress[fileId] = 100
      // Update file metadata with processed information
      state.files[fileId] = {
        ...state.files[fileId],
        ...processedData.metadata,
      }
    },
    processingError: (state, action: PayloadAction<{ fileId: string; error: string }>) => {
      const { fileId, error } = action.payload
      state.processingStatus[fileId] = "error"
      state.processingError[fileId] = error
    },
    selectFile: (state, action: PayloadAction<string>) => {
      const fileId = action.payload
      if (!state.selectedFileIds.includes(fileId)) {
        state.selectedFileIds.push(fileId)
      }
    },
    deselectFile: (state, action: PayloadAction<string>) => {
      const fileId = action.payload
      state.selectedFileIds = state.selectedFileIds.filter((id) => id !== fileId)
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
  addFile,
  updateProcessingProgress,
  fileProcessed,
  processingError,
  selectFile,
  deselectFile,
  clearFiles,
} = filesSlice.actions

export default filesSlice.reducer
