"use client"

import type React from "react"
import { memo } from "react"
import { useDispatch } from "react-redux"
import type { LogViewerRowProps } from "./types"
import { EnhancedLogViewerCell } from "./EnhancedLogViewerCell"
import { removeLogEntries } from "@/lib/slices/logsSlice"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Trash2, Copy, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

/**
 * Row component for the LogViewer
 * Renders a single log entry with cells for each column
 *
 * Performance optimized with React.memo to prevent unnecessary re-renders
 */
export const LogViewerRow = memo(
  function LogViewerRow({ log, style, columns, isSelected, isActive, onClick, timeZone }: LogViewerRowProps) {
    const dispatch = useDispatch()
    const { toast } = useToast()

    // Handle row click
    const handleClick = (event: React.MouseEvent) => {
      onClick(log, event)
    }

    // Handle copy to clipboard
    const handleCopy = () => {
      navigator.clipboard.writeText(log.raw || log.message || "")
      toast({
        title: "Copied to clipboard",
        duration: 2000,
      })
    }

    // Handle log removal
    const handleRemove = () => {
      dispatch(
        removeLogEntries({
          ids: [log.id],
          description: "Removed log entry from context menu",
        }),
      )

      toast({
        title: "Log entry removed",
        description: "The log entry has been permanently removed",
        duration: 3000,
      })
    }

    // Handle view details
    const handleViewDetails = () => {
      // This would open a modal with full log details
      toast({
        title: "View details",
        description: "This feature is not yet implemented",
        duration: 2000,
      })
    }

    // Determine row class names based on state
    const rowClassNames = `
      flex items-center border-b border-gray-100 
      ${isSelected ? "bg-teal-50" : "hover:bg-gray-50"} 
      ${isActive ? "ring-1 ring-teal-500" : ""}
      ${log.level?.toUpperCase() === "ERROR" ? "bg-red-50 hover:bg-red-100" : ""}
      ${log.level?.toUpperCase() === "WARNING" ? "bg-amber-50 hover:bg-amber-100" : ""}
    `

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div style={style} className={rowClassNames} onClick={handleClick} data-log-id={log.id} role="row">
            {columns
              .filter((column) => column.visible !== false)
              .map((column) => (
                <EnhancedLogViewerCell key={column.id} column={column} log={log} timeZone={timeZone} />
              ))}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </ContextMenuItem>
          <ContextMenuItem onClick={handleViewDetails}>
            <FileText className="h-4 w-4 mr-2" />
            View Details
          </ContextMenuItem>
          <ContextMenuItem onClick={handleRemove} className="text-red-600 focus:text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Log Entry
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
  // Custom comparison function for memo to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.log.id === nextProps.log.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.style.top === nextProps.style.top &&
      prevProps.timeZone === nextProps.timeZone &&
      prevProps.columns.length === nextProps.columns.length
    )
  },
)
