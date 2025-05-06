"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { LineChart } from "@/components/Charts"
import { runAnomalyDetection } from "@/lib/thunks/analysisThunks"
import { setAnomalySensitivity } from "@/lib/slices/analysisSlice"
import { AlertTriangle, Clock, FileText, Activity } from "lucide-react"
import type { AppDispatch, RootState } from "@/lib/store"
import type { ErrorPattern } from "@/lib/slices/analysisSlice"

export default function AnomalyDetectionPanel({ className = "" }: { className?: string }) {
  const dispatch = useDispatch<AppDispatch>()
  const [activeTab, setActiveTab] = useState("overview")

  const anomalyData = useSelector((state: RootState) => state.analysis.anomalyData)
  const sensitivity = useSelector((state: RootState) => state.analysis.anomalySensitivity)
  const isAnalyzing = useSelector((state: RootState) => state.analysis.isAnalyzing)
  const logs = useSelector((state: RootState) => state.logs.entries)
  const timeRange = useSelector((state: RootState) => state.timeline.selectedTimeRange)

  const handleRunAnalysis = () => {
    dispatch(runAnomalyDetection())
  }

  const handleSensitivityChange = (value: number[]) => {
    dispatch(setAnomalySensitivity(value[0]))
  }

  // Auto-run analysis when logs change
  useEffect(() => {
    if (Object.keys(logs).length > 0 && !anomalyData && !isAnalyzing && timeRange) {
      dispatch(runAnomalyDetection())
    }
  }, [logs, anomalyData, isAnalyzing, timeRange, dispatch])

  if (!anomalyData && !isAnalyzing) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Anomaly Detection</CardTitle>
          <CardDescription>Automatically detect unusual patterns in your logs</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <AlertTriangle className="h-16 w-16 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            No anomaly analysis has been run yet. Run analysis to detect unusual patterns.
          </p>
          <Button onClick={handleRunAnalysis} disabled={Object.keys(logs).length === 0}>
            Run Anomaly Detection
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isAnalyzing) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Anomaly Detection</CardTitle>
          <CardDescription>Analyzing logs for unusual patterns...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="animate-pulse flex flex-col items-center">
            <Activity className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-center text-muted-foreground">Analyzing logs for anomalies...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for charts
  const anomalyScoreData =
    anomalyData?.anomalyScores.map((point) => ({
      timestamp: point.timestamp,
      score: point.score,
      count: point.count,
    })) || []

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Anomaly Detection</CardTitle>
            <CardDescription>{anomalyData?.totalAnomalies} anomalies detected across your logs</CardDescription>
          </div>
          <Button onClick={handleRunAnalysis} variant="outline" size="sm">
            Reanalyze
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="time">Time-based</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="sequence">Sequence</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Time Anomalies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{anomalyData?.timeBasedAnomalies.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Unusual patterns in log frequency or distribution</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Content Anomalies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{anomalyData?.contentAnomalies.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Unusual or rare content in log messages</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Sequence Anomalies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{anomalyData?.sequenceAnomalies.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Unusual sequences or transitions between log events</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Anomaly Score Over Time</h3>
                <div className="h-64 w-full">
                  <LineChart
                    data={anomalyScoreData}
                    xKey="timestamp"
                    yKeys={["score"]}
                    labels={["Anomaly Score"]}
                    colors={["#f43f5e"]}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Detection Sensitivity</h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">Low</span>
                  <Slider
                    value={[sensitivity]}
                    min={0.1}
                    max={1}
                    step={0.1}
                    onValueChange={handleSensitivityChange}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">High</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Higher sensitivity detects more anomalies but may include false positives
                </p>
              </div>

              {anomalyData && anomalyData.totalAnomalies > 0 ? (
                <div>
                  <h3 className="text-sm font-medium mb-2">Top Anomalies</h3>
                  <div className="space-y-2">
                    {[
                      ...anomalyData.timeBasedAnomalies,
                      ...anomalyData.contentAnomalies,
                      ...anomalyData.sequenceAnomalies,
                    ]
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                      .slice(0, 3)
                      .map((anomaly) => (
                        <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                      ))}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No anomalies detected</AlertTitle>
                  <AlertDescription>Try adjusting the sensitivity or analyzing more logs</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <h3 className="text-sm font-medium">
              Time-based Anomalies ({anomalyData?.timeBasedAnomalies.length || 0})
            </h3>
            <div className="space-y-2">
              {anomalyData?.timeBasedAnomalies.length ? (
                anomalyData.timeBasedAnomalies.map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} />)
              ) : (
                <p className="text-muted-foreground">No time-based anomalies detected</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <h3 className="text-sm font-medium">Content Anomalies ({anomalyData?.contentAnomalies.length || 0})</h3>
            <div className="space-y-2">
              {anomalyData?.contentAnomalies.length ? (
                anomalyData.contentAnomalies.map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} />)
              ) : (
                <p className="text-muted-foreground">No content anomalies detected</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sequence" className="space-y-4">
            <h3 className="text-sm font-medium">Sequence Anomalies ({anomalyData?.sequenceAnomalies.length || 0})</h3>
            <div className="space-y-2">
              {anomalyData?.sequenceAnomalies.length ? (
                anomalyData.sequenceAnomalies.map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} />)
              ) : (
                <p className="text-muted-foreground">No sequence anomalies detected</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function AnomalyCard({ anomaly }: { anomaly: ErrorPattern }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getAnomalyIcon = (type: string) => {
    if (type.includes("time")) return <Clock className="h-4 w-4" />
    if (type.includes("content")) return <FileText className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  return (
    <Alert variant="outline" className="relative">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getAnomalyIcon(anomaly.metadata.anomalyType || anomaly.type)}</div>
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {anomaly.title}
            <Badge className={`${getSeverityColor(anomaly.severity)} text-white`}>{anomaly.severity}</Badge>
          </AlertTitle>
          <AlertDescription className="mt-1">
            <p>{anomaly.description}</p>
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="inline-block mr-3">{anomaly.timestamp.toLocaleString()}</span>
              <span className="inline-block">{anomaly.affectedLogs.length} affected logs</span>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}
