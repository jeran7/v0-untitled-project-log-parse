import { createAsyncThunk } from "@reduxjs/toolkit"
import { v4 as uuidv4 } from "uuid"
import type { FileMetadata } from "@/types/files"
import type { LogEntry } from "@/types/logs"
import {
  fileAdded,
  fileProcessingStarted,
  fileProcessingCompleted,
  fileProcessingError,
  fileProcessingProgress,
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
      totalChunks: Math.ceil(file.size / (1 * 1024 * 1024)), // 1MB chunks for better performance
    }

    // Add the file to the store
    dispatch(fileAdded(fileMetadata))

    // Select the file
    dispatch(selectFile(fileId))

    // Start processing the file
    dispatch(fileProcessingStarted(fileId))

    // Process the file in chunks to avoid memory issues
    try {
      // For large files, process in chunks
      if (file.size > 5 * 1024 * 1024) {
        // 5MB threshold
        await processLargeFile(file, fileId, dispatch)
      } else {
        // For small files, process all at once
        await processSmallFile(file, fileId, dispatch)
      }
    } catch (error) {
      console.error("Error processing file:", error)
      dispatch(fileProcessingError({ fileId, error: error.message || "Unknown error processing file" }))
    }

    return fileMetadata
  } catch (error) {
    console.error("Error in processFile thunk:", error)
    throw error
  }
})

/**
 * Process a small file all at once
 */
async function processSmallFile(file: File, fileId: string, dispatch: any) {
  // Read the file
  const fileContent = await readFileAsText(file)

  // Process the file content
  const processedData = processFileContent(fileContent, fileId)

  // Update file metadata
  dispatch(
    fileProcessingCompleted({
      fileId,
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        logCount: processedData.logEntries.length,
        logLevels: [...new Set(processedData.logEntries.map((entry) => entry.level).filter(Boolean))],
        sources: [...new Set(processedData.logEntries.map((entry) => entry.source).filter(Boolean))],
      },
    }),
  )

  // Add log entries to the store
  if (processedData.logEntries && processedData.logEntries.length > 0) {
    console.log(`Adding ${processedData.logEntries.length} log entries to store`)

    // Convert string timestamps to Date objects
    const processedEntries = processedData.logEntries.map((entry: any) => ({
      ...entry,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    })) as LogEntry[]

    dispatch(addLogEntries({ entries: processedEntries, fileId }))
  } else {
    console.warn("No log entries found in file")
  }
}

/**
 * Process a large file in chunks to avoid memory issues
 */
async function processLargeFile(file: File, fileId: string, dispatch: any) {
  const chunkSize = 1 * 1024 * 1024 // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize)
  let processedEntries: LogEntry[] = []
  let partialLine = ""
  const logLevels = new Set<string>()
  const sources = new Set<string>()
  let startTime: Date | null = null
  let endTime: Date | null = null

  // Process file in chunks
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    // Calculate chunk boundaries
    const startByte = chunkIndex * chunkSize
    const endByte = Math.min(startByte + chunkSize, file.size)

    // Read chunk from file
    const chunkBlob = file.slice(startByte, endByte)
    const chunkText = await readFileAsText(chunkBlob)

    // Process the chunk
    const { lines, partialLineEnd } = splitIntoLines(partialLine + chunkText)
    partialLine = partialLineEnd

    // Parse the lines
    const chunkEntries = parseLines(lines, fileId, startByte)

    // Update metadata
    chunkEntries.forEach((entry) => {
      if (entry.level) logLevels.add(entry.level)
      if (entry.source) sources.add(entry.source)

      const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date()
      if (!startTime || timestamp < startTime) startTime = timestamp
      if (!endTime || timestamp > endTime) endTime = timestamp
    })

    // Add entries to the processed list
    processedEntries = [...processedEntries, ...chunkEntries]

    // Update progress
    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100)
    dispatch(fileProcessingProgress({ fileId, progress }))

    // Allow UI to update by yielding to the event loop
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  // Process the last partial line if any
  if (partialLine) {
    const lastEntries = parseLines([partialLine], fileId, file.size - partialLine.length)
    processedEntries = [...processedEntries, ...lastEntries]
  }

  // Update file metadata
  dispatch(
    fileProcessingCompleted({
      fileId,
      metadata: {
        startTime: startTime || new Date(),
        endTime: endTime || new Date(),
        logCount: processedEntries.length,
        logLevels: Array.from(logLevels),
        sources: Array.from(sources),
      },
    }),
  )

  // Add log entries to the store
  if (processedEntries.length > 0) {
    console.log(`Adding ${processedEntries.length} log entries to store`)
    dispatch(addLogEntries({ entries: processedEntries, fileId }))
  } else {
    console.warn("No log entries found in file")
  }
}

/**
 * Read a file as text
 * @param file The file to read
 * @returns Promise that resolves to the file content as text
 */
async function readFileAsText(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

/**
 * Split text into lines, handling partial lines
 */
function splitIntoLines(text: string): { lines: string[]; partialLineEnd: string } {
  const lines = text.split(/\r?\n/)

  // If the chunk doesn't end with a newline, the last line is partial
  const endsWithNewline = text.endsWith("\n") || text.endsWith("\r\n")

  let partialLineEnd = ""
  if (!endsWithNewline && lines.length > 0) {
    partialLineEnd = lines.pop() || ""
  }

  return { lines, partialLineEnd }
}

/**
 * Parse lines into log entries
 */
function parseLines(lines: string[], fileId: string, startByte: number): LogEntry[] {
  return lines
    .filter((line) => line.trim()) // Skip empty lines
    .map((line, index) => {
      // Extract timestamp, level, source, and message from the line
      const parsedLog = parseLogLine(line)

      return {
        id: uuidv4(),
        fileId,
        lineNumber: startByte === 0 ? index + 1 : index + 1, // Adjust line number
        timestamp: parsedLog.timestamp,
        level: parsedLog.level,
        source: parsedLog.source,
        message: parsedLog.message,
        raw: line,
        ...parsedLog.fields,
      }
    })
}

/**
 * Process file content
 * @param content The file content as text
 * @param fileId The ID of the file
 * @returns Processed data including log entries
 */
function processFileContent(content: string, fileId: string) {
  // Split content into lines
  const lines = content.split(/\r?\n/).filter((line) => line.trim())

  // Process each line into a log entry
  const logEntries = lines.map((line, index) => {
    // Extract timestamp, level, source, and message from the line
    const parsedLog = parseLogLine(line)

    return {
      id: uuidv4(),
      fileId,
      lineNumber: index + 1,
      timestamp: parsedLog.timestamp,
      level: parsedLog.level,
      source: parsedLog.source,
      message: parsedLog.message,
      raw: line,
      ...parsedLog.fields,
    }
  })

  return {
    logEntries,
    metadata: {
      startTime: new Date(),
      endTime: new Date(),
      logCount: logEntries.length,
      logLevels: [...new Set(logEntries.map((entry) => entry.level).filter(Boolean))],
      sources: [...new Set(logEntries.map((entry) => entry.source).filter(Boolean))],
    },
  }
}

/**
 * Parse a log line into structured data
 * @param line Log line to parse
 */
function parseLogLine(line: string) {
  // This is a simplified parser that tries to extract common log format elements
  // In a real implementation, you would have more sophisticated parsing based on your log format

  // Try to match common timestamp patterns
  const timestampRegex = /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/
  const timestampMatch = line.match(timestampRegex)

  // Try to match common log level patterns
  const levelRegex = /\b(DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL)\b/i
  const levelMatch = line.match(levelRegex)

  // Try to extract source (often in brackets or parentheses)
  const sourceRegex = /\[([\w\-.]+)\]|$$([\w\-.]+)$$/
  const sourceMatch = line.match(sourceRegex)

  // Extract fields in key=value format
  const fields: Record<string, string> = {}
  const fieldRegex = /\b([\w\-.]+)=(["']?)([^"'\s]+|(?<=["'])[^"']*)\2/g
  let fieldMatch

  while ((fieldMatch = fieldRegex.exec(line)) !== null) {
    fields[fieldMatch[1]] = fieldMatch[3]
  }

  // Extract message (everything after timestamp, level, and source)
  let message = line
  if (timestampMatch) {
    message = message.replace(timestampMatch[0], "")
  }
  if (levelMatch) {
    message = message.replace(levelMatch[0], "")
  }
  if (sourceMatch) {
    message = message.replace(sourceMatch[0], "")
  }

  // Clean up the message
  message = message.trim()

  // If no timestamp was found, try to find a date pattern
  if (!timestampMatch) {
    const dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})\b/
    const dateMatch = line.match(dateRegex)

    if (dateMatch) {
      const timeRegex = /\b(\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AP]M)?)\b/i
      const timeMatch = line.match(timeRegex)

      if (timeMatch) {
        const dateTimeStr = `${dateMatch[1]} ${timeMatch[1]}`
        return {
          timestamp: new Date(dateTimeStr).toISOString(),
          level: levelMatch ? levelMatch[1].toUpperCase() : undefined,
          source: sourceMatch ? sourceMatch[1] || sourceMatch[2] : undefined,
          message,
          fields,
        }
      }
    }
  }

  return {
    timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    level: levelMatch ? levelMatch[1].toUpperCase() : undefined,
    source: sourceMatch ? sourceMatch[1] || sourceMatch[2] : undefined,
    message,
    fields,
  }
}
