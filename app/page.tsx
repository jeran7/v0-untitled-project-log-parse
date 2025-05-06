"use client"
import { useDispatch, useSelector } from "react-redux"
import { setUploadModalOpen } from "@/lib/slices/uiSlice"
import LogViewer from "@/components/LogViewer"
import TimelineNavigator from "@/components/Timeline/TimelineNavigator"
import FilterPanel from "@/components/Filters/FilterPanel"
import FullscreenToggle from "@/components/FullscreenToggle"
import AnalysisDashboard from "@/components/Analysis/AnalysisDashboard"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { RootState } from "@/lib/store"
import LogVisualizationDashboard from "@/components/LogVisualizationDashboard"
import FileUploader from "@/components/FileUploader"

export default function Home() {
  const dispatch = useDispatch()
  const files = useSelector((state: RootState) => state.files.files)
  const hasFiles = Object.keys(files).length > 0

  const handleOpenUploadModal = () => {
    dispatch(setUploadModalOpen(true))
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Log Analyzer</h1>
        <div className="flex gap-2">
          <Button onClick={handleOpenUploadModal} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Logs
          </Button>
          <FullscreenToggle />
        </div>
      </div>

      {!hasFiles ? (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No log files uploaded</h2>
            <p className="text-muted-foreground mb-4">Upload log files to start analyzing</p>
          </div>
          <Button onClick={handleOpenUploadModal} size="lg" className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Logs
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r p-4 flex flex-col overflow-hidden">
            <FilterPanel />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <TimelineNavigator />
            </div>
            <Tabs defaultValue="logs" className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b px-4">
                <TabsList className="h-12">
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="logs" className="flex-1 overflow-auto p-0 m-0">
                <LogViewer />
              </TabsContent>
              <TabsContent value="visualizations" className="flex-1 overflow-auto p-4 m-0">
                <LogVisualizationDashboard />
              </TabsContent>
              <TabsContent value="analysis" className="flex-1 overflow-auto p-4 m-0">
                <AnalysisDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
      <FileUploader />
    </main>
  )
}
