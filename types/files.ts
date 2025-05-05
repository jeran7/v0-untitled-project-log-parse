export interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  lastModified: number
  totalChunks: number
  // Optional fields that will be populated after processing
  startTime?: Date
  endTime?: Date
  logCount?: number
  logLevels?: string[]
  sources?: string[]
}

export interface ProcessedFile {
  metadata: Partial<FileMetadata>
  indexes: {
    timeIndex: Record<string, number[]> // Map of timestamp to line numbers
    levelIndex?: Record<string, number[]> // Map of log level to line numbers
    sourceIndex?: Record<string, number[]> // Map of source to line numbers
  }
}

export interface FileChunk {
  fileId: string
  chunkIndex: number
  data: string
  startByte: number
  endByte: number
}

export interface ChunkProcessingResult {
  fileId: string
  chunkIndex: number
  logEntries: Array<{
    id: string
    lineNumber: number
    timestamp: string
    level?: string
    source?: string
    message: string
    raw: string
  }>
  partialLine?: string // For handling lines that span chunk boundaries
}
