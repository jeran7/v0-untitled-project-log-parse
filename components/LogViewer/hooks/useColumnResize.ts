"use client"

import { useState, useCallback } from "react"
import type { ColumnDefinition } from "../types"

/**
 * Hook for managing column resizing
 *
 * @param initialColumns Initial column definitions
 * @returns Object containing columns and resize handler
 */
export function useColumnResize(initialColumns: ColumnDefinition[]) {
  // State for column definitions
  const [columns, setColumns] = useState<ColumnDefinition[]>(initialColumns)

  // Handler for resizing a column
  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumns((prevColumns) => prevColumns.map((column) => (column.id === columnId ? { ...column, width } : column)))
  }, [])

  return { columns, handleColumnResize }
}
