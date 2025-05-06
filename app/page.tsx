"use client"
import { useDispatch, useSelector } from "react-redux"
import { setFileUploadModalOpen } from "@/lib/slices/uiSlice"
import FileUploader from "@/components/FileUploader"
import FileList from "@/components/FileList"
import LogViewer from "@/components/LogViewer"
import TimelineNavigator from "@/components/Timeline/TimelineNavigator"
import FilterPanel from "@/components/Filters/FilterPanel"
import FullscreenToggle from "@/components/FullscreenToggle"
import LogVisualizationDashboard from "@/components/LogVisualizationDashboard"
import AnalysisDashboard from "@/components/Analysis/AnalysisDashboard"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { RootState } from "@/lib/store"

export default function Home() {
  const dispatch = useDispatch()
  const isFileUploadModalOpen = useSelector((state: RootState) => state.ui.fileUploadModalOpen)
  const files = useSelector((state: RootState) => state.files.files)

  const handleOpenUploadModal = () => {
    dispatch(setFileUploadModalOpen(true))
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Log Analyzer</h1>
        <div className="flex gap-2">
          <Button onClick={handleOpenUploadModal} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Logs
          </Button>
          <FullscreenToggle />
        </div>
      </div>

      {files.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <FileList />
              <div className="mt-6">
                <FilterPanel />
              </div>
            </div>
            <div className="md:col-span-3 space-y-6">
              <TimelineNavigator />
              <Tabs defaultValue="logs">
                <TabsList>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="logs" className="mt-4">
                  <LogViewer />
                </TabsContent>
                <TabsContent value="visualizations" className="mt-4">
                  <LogVisualizationDashboard />
                </TabsContent>
                <TabsContent value="analysis" className="mt-4">
                  <AnalysisDashboard />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {isFileUploadModalOpen && <FileUploader />}
    </main>
  )
}
