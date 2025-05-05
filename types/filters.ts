import type { TimeSelection } from "@/types/timeline"

/**
 * Types of log filters available
 */
export enum FilterType {
  LOG_LEVEL = "logLevel",
  SOURCE = "source",
  TIMESTAMP = "timestamp",
  TEXT = "text",
  REGEX = "regex",
  SAVED = "saved",
}

/**
 * Base interface for all filter definitions
 */
export interface BaseFilter {
  id: string
  type: FilterType
  enabled: boolean
  name: string
}

/**
 * Filter for log levels
 */
export interface LogLevelFilter extends BaseFilter {
  type: FilterType.LOG_LEVEL
  levels: string[]
}

/**
 * Filter for log sources
 */
export interface SourceFilter extends BaseFilter {
  type: FilterType.SOURCE
  sources: string[]
}

/**
 * Filter for timestamp ranges
 */
export interface TimestampFilter extends BaseFilter {
  type: FilterType.TIMESTAMP
  range: TimeSelection
}

/**
 * Filter for text search
 */
export interface TextFilter extends BaseFilter {
  type: FilterType.TEXT
  text: string
  caseSensitive: boolean
  fields: string[] // Which fields to search in
}

/**
 * Filter for regex search
 */
export interface RegexFilter extends BaseFilter {
  type: FilterType.REGEX
  pattern: string
  flags: string
  fields: string[] // Which fields to search in
}

/**
 * Saved filter preset
 */
export interface SavedFilter extends BaseFilter {
  type: FilterType.SAVED
  filters: Filter[]
}

/**
 * Union type for all filter types
 */
export type Filter = LogLevelFilter | SourceFilter | TimestampFilter | TextFilter | RegexFilter | SavedFilter

/**
 * Props for the FilterPanel component
 */
export interface FilterPanelProps {
  availableLogLevels: string[]
  availableSources: string[]
  onFiltersChanged: (filters: Filter[]) => void
  filters: Filter[]
  className?: string
}

/**
 * Metadata about available filter options
 */
export interface FilterMetadata {
  logLevels: string[]
  sources: string[]
  timeRange: TimeSelection
}

/**
 * Saved filter preset definition
 */
export interface FilterPreset {
  id: string
  name: string
  filters: Filter[]
  createdAt: Date
  lastUsed: Date | null
}
