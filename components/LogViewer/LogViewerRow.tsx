"use client"

import { memo } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import type { LogEntry } from "@/types/logs"
import { cn } from "@/lib/utils"
import LogViewerCell from "./LogViewerCell"
import AnomalyHighlighter from "./AnomalyHighlighter"

interface LogViewerRowProps {
  log: LogEntry
  columns: string[]
  isSelected: boolean
  onSelect: (id: string) => void
  columnWidths: Record<string, number>
  className?: string
}

function LogViewerRow({ log, columns, isSelected, onSelect, columnWidths, className }: LogViewerRowProps) {
  const highlightedLogIds = useSelector((state: RootState) => state.logs.highlightedLogIds)
  const isHighlighted = highlightedLogIds.includes(log.id)

  return (
    <AnomalyHighlighter logId={log.id}>
      <div
        className={cn(
          "flex border-b border-border hover:bg-muted/50 cursor-pointer transition-colors",
          isSelected && "bg-muted",
          isHighlighted && "bg-yellow-50 dark:bg-yellow-900/20",
          className,
        )}
        onClick={() => onSelect(log.id)}
        data-testid="log-row"
      >
        {columns.map((column) => (
          <LogViewerCell key={column} column={column} log={log} width={columnWidths[column] || 100} />
        ))}
      </div>
    </AnomalyHighlighter>
  )
}

export default memo(LogViewerRow)
