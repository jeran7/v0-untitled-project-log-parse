"use client"

import { useState } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ErrorAnalysisPanel from "./Analysis/ErrorAnalysisPanel"
import TimeSeriesVisualization from "./Visualizations/TimeSeriesVisualization"
import LogPatternVisualization from "./Visualizations/LogPatternVisualization"
import SourceDistributionChart from "./Visualizations/SourceDistributionChart"
import { BarChart2, Activity, AlertTriangle, Clock } from "lucide-react"

export default function LogVisualizationDashboard() {
  const [activeTab, setActiveTab] = useState("timeSeries")
  const hasFiles = useSelector((state: RootState) => Object.keys(state.files.files).length > 0)
  const logs = useSelector((state: RootState) => Object.values(state.logs.entries))

  if (!hasFiles || logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Log Data Available</h2>
          <p className="text-muted-foreground">Upload log files to see visualizations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Log Visualizations</h2>

      <Tabs defaultValue="timeSeries" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="timeSeries" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            Time Series
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-1">
            <BarChart2 className="h-4 w-4" />
            Log Patterns
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Source Distribution
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Error Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeSeries" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Log Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <TimeSeriesVisualization />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Log Pattern Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <LogPatternVisualization />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Log Source Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <SourceDistributionChart />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="mt-0">
          <ErrorAnalysisPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
