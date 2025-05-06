"use client"

import { useEffect, useState, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { setFileUploadModalOpen } from "@/lib/slices/uiSlice"
import { setTimeSelection, setJumpToTimestamp } from "@/lib/slices/timelineSlice"
import { setAvailableLogLevels, setAvailableSources } from "@/lib/slices/filtersSlice"
import FileUploader from "@/components/FileUploader"
import { LogViewer } from "@/components/LogViewer/LogViewer"
import FileList from "@/components/FileList"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, SplitSquareVertical, Layers } from "lucide-react"
import TimelineVisualization from "@/components/Timeline/TimelineVisualization"
import AdvancedFilterPanel from "@/components/Filters/AdvancedFilterPanel"
import LogRemovalPanel from "@/components/LogRemoval/LogRemovalPanel"
import FullscreenToggle from "@/components/FullscreenToggle"

export default function LogVisualizationDashboard() {
  const dispatch = useDispatch()
  const dashboardRef = useRef<HTMLDivElement>(null)
  const isFileUploadModalOpen = useSelector((state: RootState) => state.ui.isFileUploadModalOpen)
  const files = useSelector((state: RootState) => state.files.files)
  const selectedFileIds = useSelector((state: RootState) => state.files.selectedFileIds)
  const viewMode = useSelector((state: RootState) => state.ui.viewMode)
  const logEntries = useSelector((state: RootState) => state.logs.entries)
  const removedCount = useSelector((state: RootState) => state.logs.removedCount)
  const timelineSelection = useSelector((state: RootState) => state.timeline.selection)
  const jumpToTimestamp = useSelector((state: RootState) => state.timeline.jumpToTimestamp)
  const [activeTab, setActiveTab] = useState("correlated")
  const [activeSidebarTab, setActiveSidebarTab] = useState("filters")

  const handleOpenFileUploadModal = () => {
    dispatch(setFileUploadModalOpen(true))
  }

  // Update active tab when view mode changes
  useEffect(() => {
    setActiveTab(viewMode)
  }, [viewMode])

  // Extract available log levels and sources for filters
  useEffect(() => {
    if (Object.keys(logEntries).length > 0) {
      // Get unique log levels
      const logLevels = new Set<string>()
      // Get unique sources
      const sources = new Set<string>()

      Object.values(logEntries).forEach((entry) => {
        if (entry.level) logLevels.add(entry.level)
        if (entry.source) sources.add(entry.source)
      })

      dispatch(setAvailableLogLevels(Array.from(logLevels)))
      dispatch(setAvailableSources(Array.from(sources)))
    }
  }, [logEntries, dispatch])

  // Handle time range selection from timeline
  const handleTimeRangeChanged = (range: { start: Date; end: Date }) => {
    dispatch(setTimeSelection(range))
  }

  // Handle jump to specific time
  const handleJumpToTime = (timestamp: Date) => {
    dispatch(setJumpToTimestamp(timestamp))
  }

  return (
    <div ref={dashboardRef} className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-teal-700">Xage Security Log Visualization</h2>
        <div className="flex items-center gap-2">
          <FullscreenToggle targetRef={dashboardRef} />
          <Button onClick={handleOpenFileUploadModal} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700">
            <Upload size={16} />
            Upload Logs
          </Button>
        </div>
      </div>

      {Object.keys(files).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted rounded-lg p-8">
          <h3 className="text-lg font-medium mb-2">No log files uploaded</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Upload CSV audit logs or system logs to visualize and correlate them with synchronized timestamp-based
            navigation.
          </p>
          <Button onClick={handleOpenFileUploadModal} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700">
            <Upload size={16} />
            Upload Logs
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-card rounded-lg border shadow-sm p-4 flex-shrink-0">
              <FileList />
            </div>
            <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-auto">
              <Tabs value={activeSidebarTab} onValueChange={setActiveSidebarTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="filters" className="flex-1">
                    Filters
                  </TabsTrigger>
                  <TabsTrigger value="removal" className="flex-1 relative">
                    Remove
                    {removedCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {removedCount > 99 ? "99+" : removedCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="mt-0">
                  <AdvancedFilterPanel />
                </TabsContent>

                <TabsContent value="removal" className="mt-0">
                  <LogRemovalPanel />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-card rounded-lg border shadow-sm p-4">
              <TimelineVisualization />
            </div>
            <div className="flex-1 bg-card rounded-lg border shadow-sm p-4 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="correlated" className="flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    Correlated View
                  </TabsTrigger>
                  <TabsTrigger value="split" className="flex items-center gap-1">
                    <SplitSquareVertical className="w-4 h-4" />
                    Split View
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="correlated" className="h-[calc(100%-40px)]">
                  {selectedFileIds.length > 0 ? (
                    <LogViewer fileId={selectedFileIds[0]} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Select a file to view logs
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="split" className="h-[calc(100%-40px)]">
                  {selectedFileIds.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 h-full">
                      {selectedFileIds.map((fileId) => (
                        <div key={fileId} className="h-full">
                          <div className="font-medium text-sm mb-1 text-teal-700">{files[fileId]?.name}</div>
                          <div className="h-[calc(100%-24px)]">
                            <LogViewer fileId={fileId} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Select files to view logs
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {isFileUploadModalOpen && <FileUploader />}
    </div>
  )
}
