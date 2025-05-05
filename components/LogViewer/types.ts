import type React from "react"
import type { LogEntry } from "@/types/logs"

/**
 * Props for the LogViewer component
 */
export interface LogViewerProps {
  /** ID of the file to display logs for */
  fileId: string
  /** Optional height for the component */
  height?: string | number
}

/**
 * Definition for a column in the log viewer
 */
export interface ColumnDefinition {
  /** Unique identifier for the column */
  id: string
  /** Display label for the column */
  label: string
  /** Field in the log entry to display */
  field: keyof LogEntry | string
  /** Width of the column in pixels */
  width: number
  /** Whether the column can be resized */
  resizable?: boolean
  /** Whether the column can be reordered */
  reorderable?: boolean
  /** Whether the column is visible */
  visible?: boolean
  /** Optional formatter function for the column value */
  formatter?: (value: any, log: LogEntry, timeZone?: string) => React.ReactNode
  /** Optional class name for the column */
  className?: string
}

/**
 * State for synchronized scrolling between log viewers
 */
export interface SyncScrollState {
  /** Timestamp to synchronize to */
  timestamp: Date | null
  /** ID of the file that initiated the sync */
  sourceFileId: string | null
  /** Whether scrolling is in progress */
  isScrolling: boolean
}

/**
 * Context for the LogViewer component
 */
export interface LogViewerContextType {
  /** ID of the file being displayed */
  fileId: string
  /** Column definitions */
  columns: ColumnDefinition[]
  /** Handler for column resize */
  handleColumnResize: (columnId: string, width: number) => void
  /** Handler for column reorder */
  handleColumnReorder: (sourceId: string, targetId: string) => void
  /** IDs of selected logs */
  selectedLogs: string[]
  /** Handler for log selection */
  handleLogSelect: (logId: string) => void
  /** Filter text for logs */
  filterText: string
  /** Handler for filter text change */
  setFilterText: (text: string) => void
}

/**
 * Props for the LogViewerRow component
 */
export interface LogViewerRowProps {
  /** Log entry to display */
  log: LogEntry
  /** Style object from react-window */
  style: React.CSSProperties
  /** Column definitions */
  columns: ColumnDefinition[]
  /** Whether the row is selected */
  isSelected: boolean
  /** Whether the row is active */
  isActive: boolean
  /** Click handler for the row */
  onClick: (log: LogEntry, event: React.MouseEvent) => void
  /** Time zone for timestamp formatting */
  timeZone: string
}

/**
 * Props for the LogViewerCell component
 */
export interface LogViewerCellProps {
  /** Column definition */
  column: ColumnDefinition
  /** Log entry */
  log: LogEntry
  /** Time zone for timestamp formatting */
  timeZone?: string
}

/**
 * Props for the LogViewerHeaderCell component
 */
export interface LogViewerHeaderCellProps {
  /** Column definition */
  column: ColumnDefinition
  /** Handler for column resize */
  onResize: (columnId: string, width: number) => void
  /** Index of the column */
  index: number
}

/**
 * Props for the LogViewerPlaceholder component
 */
export interface LogViewerPlaceholderProps {
  /** Message to display */
  message: string
}

/**
 * Props for the LogViewerError component
 */
export interface LogViewerErrorProps {
  /** Error object */
  error: Error
  /** Handler for reset */
  onReset: () => void
  /** Message to display */
  message: string
}
