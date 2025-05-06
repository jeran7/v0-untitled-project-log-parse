"use client"

import { useState } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FileUploader from "./FileUploader"
import FileList from "./FileList"
import LogViewer from "./LogViewer"
import TimelineNavigator from "./Timeline/TimelineNavigator"
import AdvancedFilterPanel from "./Filters/AdvancedFilterPanel"
import LogRemovalPanel from "./LogRemoval/LogRemovalPanel"
import FullscreenToggle from "./FullscreenToggle"
import AnalysisDashboard from "./Analysis/AnalysisDashboard"

export default function LogVisualizationDashboard() {
  const [activeTab, setActiveTab] = useState("logs")
  const hasFiles = useSelector((state: RootState) => Object.keys(state.files.files).length > 0)
  const isFullscreen = useSelector((state: RootState) => state.ui.isFullscreen)

  return (
    <div className={`flex flex-col h-screen ${isFullscreen ? "fullscreen-mode" : ""}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Xage Security Log Visualization Tool</h1>
        <div className="flex items-center gap-2">
          <FullscreenToggle />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r p-4 flex flex-col overflow-hidden">
          <FileUploader />
          <div className="mt-4 flex-1 overflow-auto">
            <FileList />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            defaultValue="logs"
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b px-4">
              <TabsList className="h-12">
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="analysis" disabled={!hasFiles}>
                  Analysis
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden p-0 m-0">
              {hasFiles ? (
                <>
                  <div className="p-4 border-b">
                    <TimelineNavigator />
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-hidden">
                      <LogViewer />
                    </div>
                    <div className="w-80 border-l overflow-auto">
                      <div className="p-4">
                        <AdvancedFilterPanel />
                      </div>
                      <div className="p-4 border-t">
                        <LogRemovalPanel />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">No Log Files</h2>
                    <p className="text-muted-foreground mb-4">Upload log files to start analyzing your data</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 overflow-hidden p-0 m-0">
              <AnalysisDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
