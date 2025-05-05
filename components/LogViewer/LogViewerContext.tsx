"use client"

import { createContext, useContext } from "react"
import type { LogViewerContextType } from "./types"

/**
 * Context for sharing state and handlers across LogViewer components
 */
export const LogViewerContext = createContext<LogViewerContextType | null>(null)

/**
 * Hook to use the LogViewer context
 * @returns The LogViewer context
 * @throws Error if used outside of a LogViewerContext.Provider
 */
export function useLogViewerContext() {
  const context = useContext(LogViewerContext)

  if (!context) {
    throw new Error("useLogViewerContext must be used within a LogViewerContext.Provider")
  }

  return context
}
