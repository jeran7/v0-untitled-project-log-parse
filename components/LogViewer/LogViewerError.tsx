"use client"
import type { LogViewerErrorProps } from "./types"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Error component for the LogViewer
 * Displayed when an error occurs during rendering
 */
export function LogViewerError({ error, onReset, message }: LogViewerErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-red-50 border border-red-200 rounded-md">
      <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
      <p className="text-lg font-medium text-red-700">{message}</p>
      <p className="mt-2 text-sm text-red-600">{error.message || "An unknown error occurred"}</p>
      <Button
        onClick={onReset}
        className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  )
}
