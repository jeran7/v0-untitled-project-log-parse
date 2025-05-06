"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { generateStatisticalReport } from "@/lib/thunks/analysisThunks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart2, RefreshCw, Download, Clock, Calendar } from "lucide-react"
import { formatTimestamp } from "@/lib/utils/timeUtils"

// Direct imports instead of using the index file
import BarChart from "@/components/Charts/BarChart"
import LineChart from "@/components/Charts/LineChart"
import PieChart from "@/components/Charts/PieChart"

export default function StatisticalDashboard({ className = "" }: { className?: string }) {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState("overview")

  // Get data from Redux store
  const statisticalSummary = useSelector((state: RootState) => state.analysis.statisticalSummary)
  const timeSeriesData = useSelector((state: RootState) => state.analysis.timeSeriesData)
  const isAnalyzing = useSelector((state: RootState) => state.analysis.isAnalyzing)
  const analysisProgress = useSelector((state: RootState) => state.analysis.analysisProgress)
  const logs = useSelector((state: RootState) => state.logs.entries)

  // Auto-generate report when logs change
  useEffect(() => {
    if (Object.keys(logs).length > 0 && !statisticalSummary && !isAnalyzing) {
      dispatch(generateStatisticalReport())
    }
  }, [logs, statisticalSummary, isAnalyzing, dispatch])

  // Handle generating statistical report
  const handleGenerateReport = () => {
    dispatch(generateStatisticalReport())
  }

  // Handle exporting report
  const handleExportReport = () => {
    if (!statisticalSummary) return

    // Create report data
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: statisticalSummary,
      timeSeriesData,
    }

    // Convert to JSON and create download link
    const dataStr = JSON.stringify(reportData, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `log-analysis-report-${new Date().toISOString().slice(0, 10)}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  // Prepare chart data
  const prepareLogLevelData = () => {
    if (!statisticalSummary) return []

    return [
      { name: "Error", value: statisticalSummary.errorCount, color: "#DC2626" },
      { name: "Warning", value: statisticalSummary.warningCount, color: "#D97706" },
      { name: "Info", value: statisticalSummary.infoCount, color: "#0891B2" },
      { name: "Debug", value: statisticalSummary.debugCount, color: "#0D9488" },
    ]
  }

  const prepareTimeDistributionData = () => {
    if (!statisticalSummary?.timeDistribution) return []

    return Object.entries(statisticalSummary.timeDistribution).map(([hour, count]) => ({
      name: `${hour}:00`,
      value: count,
    }))
  }

  const prepareDayDistributionData = () => {
    if (!statisticalSummary?.dayDistribution) return []

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    return Object.entries(statisticalSummary.dayDistribution).map(([day, count]) => ({
      name: dayNames[Number.parseInt(day)],
      value: count,
    }))
  }

  const prepareTimeSeriesData = () => {
    if (!timeSeriesData || timeSeriesData.length === 0) return []

    return timeSeriesData.map((point) => ({
      name: formatTimestamp(point.timestamp.toISOString(), "UTC", "time"),
      total: point.count,
      errors: point.errorCount,
      warnings: point.warningCount,
      info: point.infoCount,
      debug: point.debugCount,
    }))
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md flex items-center">
          <BarChart2 className="mr-2 h-4 w-4" />
          Statistical Analysis
        </CardTitle>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerateReport}
            disabled={isAnalyzing || Object.keys(logs).length === 0}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>

          <Button variant="outline" onClick={handleExportReport} disabled={!statisticalSummary}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyzing ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">Generating statistical report...</div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="text-center text-xs text-muted-foreground">{analysisProgress}% complete</div>
          </div>
        ) : statisticalSummary ? (
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="time">Time Analysis</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-4">Log Level Distribution</h3>
                  <div className="h-64">
                    <PieChart data={prepareLogLevelData()} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Logs:</span>
                      <span className="font-medium">{statisticalSummary.totalLogs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Errors:</span>
                      <span className="font-medium">{statisticalSummary.errorCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">Warnings:</span>
                      <span className="font-medium">{statisticalSummary.warningCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Info:</span>
                      <span className="font-medium">{statisticalSummary.infoCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-600">Debug:</span>
                      <span className="font-medium">{statisticalSummary.debugCount}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-4">Log Activity Over Time</h3>
                  <div className="h-64">
                    <LineChart
                      data={prepareTimeSeriesData()}
                      lines={[
                        { key: "total", color: "#64748b" },
                        { key: "errors", color: "#DC2626" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="time">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Activity by Hour of Day
                  </h3>
                  <div className="h-64">
                    <BarChart data={prepareTimeDistributionData()} color="#0891B2" />
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Activity by Day of Week
                  </h3>
                  <div className="h-64">
                    <BarChart data={prepareDayDistributionData()} color="#0D9488" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sources">
              <div className="border rounded-md p-4">
                <h3 className="text-sm font-medium mb-4">Top Log Sources</h3>
                {statisticalSummary.topSources.length > 0 ? (
                  <div className="space-y-2">
                    {statisticalSummary.topSources.map((source, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-48 truncate" title={source.source}>
                          {source.source || "Unknown"}
                        </div>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{
                              width: `${(source.count / statisticalSummary.totalLogs) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="w-16 text-right text-sm">{source.count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No source information available in logs</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="errors">
              <div className="border rounded-md p-4">
                <h3 className="text-sm font-medium mb-4">Top Error Messages</h3>
                {statisticalSummary.topErrors.length > 0 ? (
                  <div className="space-y-3">
                    {statisticalSummary.topErrors.map((error, index) => (
                      <div key={index} className="border-b pb-2">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-sm">Error #{index + 1}</span>
                          <span className="text-sm text-red-600">{error.count} occurrences</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{error.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No errors found in logs</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No statistical data available. Generate a report to see statistics.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
