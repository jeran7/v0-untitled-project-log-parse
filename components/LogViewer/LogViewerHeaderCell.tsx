"use client"

import type React from "react"
import { useRef } from "react"
import { useDrag, useDrop } from "react-dnd"
import { Resizable } from "react-resizable"
import type { LogViewerHeaderCellProps } from "./types"
import { useLogViewerContext } from "./LogViewerContext"
import { GripVertical } from "lucide-react"

/**
 * Header cell component for the LogViewer
 * Supports resizing and reordering
 */
export function LogViewerHeaderCell({ column, onResize, index }: LogViewerHeaderCellProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { handleColumnReorder } = useLogViewerContext()

  // Setup drag and drop for column reordering
  const [{ isDragging }, drag] = useDrag({
    type: "COLUMN",
    item: { id: column.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => column.reorderable !== false,
  })

  const [{ isOver }, drop] = useDrop({
    accept: "COLUMN",
    hover(item: { id: string; index: number }, monitor) {
      if (!ref.current) return

      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return

      // Time to actually perform the action
      handleColumnReorder(item.id, column.id)

      // Update the index for the next hover
      item.index = hoverIndex
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  // Connect drag and drop refs
  drag(drop(ref))

  // Handle column resize
  const handleResize = (event: React.SyntheticEvent, { size }: { size: { width: number; height: number } }) => {
    onResize(column.id, size.width)
  }

  // Render the header cell
  const renderCell = () => (
    <div
      ref={ref}
      className={`
        flex items-center h-full px-2 
        text-xs font-medium text-gray-700 
        select-none cursor-pointer
        ${isDragging ? "opacity-50" : ""}
        ${isOver ? "bg-gray-200" : ""}
      `}
      style={{ width: column.width }}
    >
      {column.reorderable !== false && <GripVertical className="w-4 h-4 mr-1 text-gray-400" />}
      <span className="truncate">{column.label}</span>
    </div>
  )

  // If the column is resizable, wrap it in a Resizable component
  if (column.resizable !== false) {
    return (
      <Resizable
        width={column.width}
        height={32}
        onResize={handleResize}
        handle={
          <div
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize group"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full w-1 bg-transparent group-hover:bg-teal-500" />
          </div>
        }
        resizeHandles={["e"]}
      >
        <div className="relative h-full" style={{ width: column.width }}>
          {renderCell()}
        </div>
      </Resizable>
    )
  }

  // If not resizable, just render the cell
  return renderCell()
}
