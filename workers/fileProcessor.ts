/* eslint-disable no-restricted-globals */
import type { ChunkProcessingResult, FileChunk } from "@/types/files"
import { parseCSVChunk, parseLogChunk } from "@/lib/parsers"
import { normalizeTimestamp } from "@/lib/utils/timeUtils"

// Set up the worker context
const ctx: Worker = self as any

// Handle messages from the main thread
ctx.addEventListener("message", async (event) => {
  const { type, payload } = event.data

  switch (type) {
    case "PROCESS_FILE":
      await processFile(payload.file, payload.fileId)
      break
    case "PROCESS_CHUNK":
      await processChunk(payload.chunk)
      break
    default:
      console.error("Unknown message type:", type)
  }
})

/**
 * Process a file by breaking it into chunks and processing each chunk
 * @param file The file to process
 * @param fileId The unique ID for the file
 */
async function processFile(file: File, fileId: string) {
  try {
    // Determine the file type and select appropriate parser
    const fileType = determineFileType(file)

    // Initialize metadata
    const metadata = {
      startTime: null,
      endTime: null,
      logCount: 0,
      logLevels: new Set<string>(),
      sources: new Set<string>(),
    }

    // Create indexes for efficient lookup
    const indexes = {
      timeIndex: {} as Record<string, number[]>,
      levelIndex: {} as Record<string, number[]>,
      sourceIndex: {} as Record<string, number[]>,
      // Collect all chunk results
    }
    const chunkResults: ChunkProcessingResult[] = []

    // Calculate chunk size (5MB)
    const chunkSize = 5 * 1024 * 1024
    const totalChunks = Math.ceil(file.size / chunkSize)

    // Process file in chunks to avoid memory issues
    let partialLine = ""
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Calculate chunk boundaries
      const startByte = chunkIndex * chunkSize
      const endByte = Math.min(startByte + chunkSize, file.size)

      // Read chunk from file
      const chunk = await readFileChunk(file, startByte, endByte)

      // Process the chunk
      const chunkResult = await processChunkInternal(
        {
          fileId,
          chunkIndex,
          data: partialLine + chunk,
          startByte,
          endByte,
        },
        fileType,
      )

      // Save partial line for next chunk
      partialLine = chunkResult.partialLine || ""

      // Update metadata and indexes
      updateMetadataAndIndexes(metadata, indexes, chunkResult)

      // Save chunk result
      chunkResults.push(chunkResult)

      // Report progress
      ctx.postMessage({
        type: "PROGRESS",
        payload: {
          progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
        },
      })
    }

    // Process the last partial line if any
    if (partialLine) {
      const lastChunkResult = await processChunkInternal(
        {
          fileId,
          chunkIndex: totalChunks,
          data: partialLine,
          startByte: file.size - partialLine.length,
          endByte: file.size,
        },
        fileType,
      )

      updateMetadataAndIndexes(metadata, indexes, lastChunkResult)

      // Save chunk result
      chunkResults.push(lastChunkResult)
    }

    // Send completed message with processed data
    ctx.postMessage({
      type: "COMPLETED",
      payload: {
        processedData: {
          metadata: {
            startTime: metadata.startTime,
            endTime: metadata.endTime,
            logCount: metadata.logCount,
            logLevels: Array.from(metadata.logLevels),
            sources: Array.from(metadata.sources),
          },
          indexes,
        },
        // Add the log entries to the payload
        logEntries: chunkResults.flatMap((result) => result.logEntries),
      },
    })
  } catch (error) {
    ctx.postMessage({
      type: "ERROR",
      payload: {
        error: error.message || "Unknown error processing file",
      },
    })
  }
}

/**
 * Process a single chunk of a file
 * @param chunk The chunk to process
 */
async function processChunk(chunk: FileChunk) {
  try {
    const fileType = chunk.fileId.endsWith(".csv") ? "csv" : "log"
    const result = await processChunkInternal(chunk, fileType)

    ctx.postMessage({
      type: "CHUNK_PROCESSED",
      payload: {
        result,
      },
    })
  } catch (error) {
    ctx.postMessage({
      type: "ERROR",
      payload: {
        error: error.message || "Unknown error processing chunk",
      },
    })
  }
}

/**
 * Internal function to process a chunk based on file type
 * @param chunk The chunk to process
 * @param fileType The type of file (csv, log, etc.)
 */
async function processChunkInternal(chunk: FileChunk, fileType: string): Promise<ChunkProcessingResult> {
  // Split the chunk into lines, keeping track of partial lines
  const { lines, partialLine } = splitIntoLines(chunk.data)

  // Parse the lines based on file type
  let logEntries = []

  if (fileType === "csv") {
    logEntries = parseCSVChunk(lines, chunk.fileId, chunk.startByte)
  } else {
    logEntries = parseLogChunk(lines, chunk.fileId, chunk.startByte)
  }

  // Normalize timestamps to UTC
  logEntries = logEntries.map((entry) => ({
    ...entry,
    timestamp: normalizeTimestamp(entry.timestamp),
  }))

  return {
    fileId: chunk.fileId,
    chunkIndex: chunk.chunkIndex,
    logEntries,
    partialLine,
  }
}

/**
 * Read a chunk of a file
 * @param file The file to read from
 * @param start The starting byte
 * @param end The ending byte
 */
async function readFileChunk(file: File, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      resolve(e.target.result as string)
    }

    reader.onerror = (e) => {
      reject(new Error("Error reading file chunk"))
    }

    const blob = file.slice(start, end)
    reader.readAsText(blob)
  })
}

/**
 * Split a chunk of text into lines, handling partial lines
 * @param text The text to split
 */
function splitIntoLines(text: string): { lines: string[]; partialLine: string } {
  const lines = text.split(/\r?\n/)

  // If the chunk doesn't end with a newline, the last line is partial
  const endsWithNewline = text.endsWith("\n") || text.endsWith("\r\n")

  let partialLine = ""
  if (!endsWithNewline && lines.length > 0) {
    partialLine = lines.pop() || ""
  }

  return { lines, partialLine }
}

/**
 * Update metadata and indexes with results from a chunk
 * @param metadata The metadata to update
 * @param indexes The indexes to update
 * @param chunkResult The result from processing a chunk
 */
function updateMetadataAndIndexes(metadata: any, indexes: any, chunkResult: ChunkProcessingResult) {
  chunkResult.logEntries.forEach((entry) => {
    // Update log count
    metadata.logCount++

    // Update time range
    const timestamp = new Date(entry.timestamp)
    if (!metadata.startTime || timestamp < metadata.startTime) {
      metadata.startTime = timestamp
    }
    if (!metadata.endTime || timestamp > metadata.endTime) {
      metadata.endTime = timestamp
    }

    // Update log levels
    if (entry.level) {
      metadata.logLevels.add(entry.level)

      // Update level index
      if (!indexes.levelIndex[entry.level]) {
        indexes.levelIndex[entry.level] = []
      }
      indexes.levelIndex[entry.level].push(entry.lineNumber)
    }

    // Update sources
    if (entry.source) {
      metadata.sources.add(entry.source)

      // Update source index
      if (!indexes.sourceIndex[entry.source]) {
        indexes.sourceIndex[entry.source] = []
      }
      indexes.sourceIndex[entry.source].push(entry.lineNumber)
    }

    // Update time index
    const timeKey = timestamp.getTime().toString()
    if (!indexes.timeIndex[timeKey]) {
      indexes.timeIndex[timeKey] = []
    }
    indexes.timeIndex[timeKey].push(entry.lineNumber)
  })
}

/**
 * Determine the type of file based on extension and content
 * @param file The file to analyze
 */
function determineFileType(file: File): string {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".csv")) {
    return "csv"
  } else if (fileName.endsWith(".log") || fileName.endsWith(".txt")) {
    return "log"
  }

  // Default to log format
  return "log"
}
