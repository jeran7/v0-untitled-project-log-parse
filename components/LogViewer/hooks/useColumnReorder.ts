"use client"

import { useCallback } from "react"
import type { ColumnDefinition } from "../types"

/**
 * Hook for managing column reordering
 *
 * @param columns Current column definitions
 * @param onChange Callback for when columns change
 * @returns Object containing reorder handler
 */
export function useColumnReorder(columns: ColumnDefinition[], onChange: (columns: ColumnDefinition[]) => void) {
  // Handler for reordering columns
  const handleColumnReorder = useCallback(
    (sourceId: string, targetId: string) => {
      // Find the source and target columns
      const sourceIndex = columns.findIndex((col) => col.id === sourceId)
      const targetIndex = columns.findIndex((col) => col.id === targetId)

      if (sourceIndex === -1 || targetIndex === -1) return

      // Create a new array with the reordered columns
      const newColumns = [...columns]
      const [removed] = newColumns.splice(sourceIndex, 1)
      newColumns.splice(targetIndex, 0, removed)

      // Call the onChange callback with the new columns
      onChange(newColumns)
    },
    [columns, onChange],
  )

  return { handleColumnReorder }
}
