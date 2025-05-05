import type { LogViewerPlaceholderProps } from "./types"
import { FileText } from "lucide-react"

/**
 * Placeholder component for the LogViewer
 * Displayed when there are no logs to show or during loading
 */
export function LogViewerPlaceholder({ message }: LogViewerPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 border border-gray-200 rounded-md">
      <FileText className="w-12 h-12 mb-4 text-gray-400" />
      <p className="text-lg font-medium text-gray-700">{message}</p>
      <p className="mt-2 text-sm text-gray-500">Try adjusting your filters or uploading a different log file</p>
    </div>
  )
}
