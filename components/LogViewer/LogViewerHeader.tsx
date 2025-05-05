"use client"
import { useLogViewerContext } from "./LogViewerContext"
import { LogViewerHeaderCell } from "./LogViewerHeaderCell"
import { Search } from "lucide-react"

/**
 * Header component for the LogViewer
 * Displays column headers and filter controls
 */
export function LogViewerHeader() {
  const { columns, handleColumnResize, filterText, setFilterText } = useLogViewerContext()

  return (
    <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
      {/* Filter row */}
      <div className="flex items-center px-2 py-1 border-b border-gray-200">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter logs..."
            className="w-full py-1 pl-8 pr-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex h-8 bg-gray-100">
        {columns
          .filter((column) => column.visible !== false)
          .map((column, index) => (
            <LogViewerHeaderCell key={column.id} column={column} onResize={handleColumnResize} index={index} />
          ))}
      </div>
    </div>
  )
}
