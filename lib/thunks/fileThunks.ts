import { createAsyncThunk } from "@reduxjs/toolkit"
import { v4 as uuidv4 } from "uuid"
import type { FileMetadata } from "@/types/files"
import type { LogEntry } from "@/types/logs"
import {
  fileAdded,
  fileProcessingStarted,
  fileProcessingProgress,
  fileProcessingCompleted,
  fileProcessingError,
  selectFile,
} from "@/lib/slices/filesSlice"
import { addLogEntries } from "@/lib/slices/logsSlice"

/**
 * Thunk for processing a file
 * This handles the file processing workflow:
 * 1. Create a file metadata object
 * 2. Add the file to the store
 * 3. Start processing the file in a web worker
 * 4. Update progress as the file is processed
 * 5. Add the processed log entries to the store
 * 6. Update the file metadata with the processed information
 */
export const processFile = createAsyncThunk("files/processFile", async (file: File, { dispatch }) => {
  try {
    console.log("Processing file:", file.name)

    // Generate a unique ID for the file
    const fileId = uuidv4()

    // Create a file metadata object
    const fileMetadata: FileMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      totalChunks: Math.ceil(file.size / (5 * 1024 * 1024)), // 5MB chunks
    }

    // Add the file to the store
    dispatch(fileAdded(fileMetadata))

    // Select the file
    dispatch(selectFile(fileId))

    // Start processing the file
    dispatch(fileProcessingStarted(fileId))

    // Create a web worker for processing the file
    const worker = new Worker(new URL("@/workers/fileProcessor.ts", import.meta.url), { type: "module" })

    // Handle messages from the worker
    worker.onmessage = (event) => {
      const { type, payload } = event.data

      switch (type) {
        case "PROGRESS":
          dispatch(fileProcessingProgress({ fileId, progress: payload.progress }))
          break
        case "COMPLETED":
          console.log("File processing completed:", payload)

          // Update file metadata
          dispatch(
            fileProcessingCompleted({
              fileId,
              metadata: payload.processedData.metadata,
            }),
          )

          // Add log entries to the store
          if (payload.logEntries && payload.logEntries.length > 0) {
            console.log(`Adding ${payload.logEntries.length} log entries to store`)

            // Convert string timestamps to Date objects
            const processedEntries = payload.logEntries.map((entry: any) => ({
              ...entry,
              timestamp: new Date(entry.timestamp),
            })) as LogEntry[]

            dispatch(addLogEntries({ entries: processedEntries, fileId }))
          } else {
            console.warn("No log entries returned from worker")
          }
          break
        case "ERROR":
          console.error("Error processing file:", payload.error)
          dispatch(fileProcessingError({ fileId, error: payload.error }))
          break
      }
    }

    // Handle worker errors
    worker.onerror = (error) => {
      console.error("Worker error:", error)
      dispatch(fileProcessingError({ fileId, error: error.message || "Unknown worker error" }))
    }

    // Send the file to the worker for processing
    worker.postMessage({
      type: "PROCESS_FILE",
      payload: { file, fileId },
    })

    return fileMetadata
  } catch (error) {
    console.error("Error in processFile thunk:", error)
    throw error
  }
})
