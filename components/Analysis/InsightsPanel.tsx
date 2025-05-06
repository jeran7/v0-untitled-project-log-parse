"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { generateInsights, markInsightAsReviewed } from "@/lib/thunks/analysisThunks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, Clock, Lightbulb, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react"
import { formatTimestamp } from "@/lib/utils/timeUtils"

export default function InsightsPanel({ className = "" }: { className?: string }) {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState("all")

  // Get data from Redux store
  const insights = useSelector((state: RootState) => state.analysis.insights)
  const isAnalyzing = useSelector((state: RootState) => state.analysis.isAnalyzing)
  const analysisProgress = useSelector((state: RootState) => state.analysis.analysisProgress)
  const logs = useSelector((state: RootState) => state.logs.entries)

  // Handle generating insights
  const handleGenerateInsights = () => {
    dispatch(generateInsights())
  }

  // Handle marking insight as helpful or not helpful
  const handleMarkInsight = (insightId: string, isHelpful: boolean) => {
    dispatch(markInsightAsReviewed({ insightId, isHelpful }))
  }

  // Filter insights based on active tab
  const filteredInsights = insights.filter((insight) => {
    if (activeTab === "all") return true
    if (activeTab === "security") return insight.category === "security"
    if (activeTab === "performance") return insight.category === "performance"
    if (activeTab === "errors") return insight.category === "error"
    return true
  })

  // Get severity counts for the badge
  const securityCount = insights.filter((i) => i.category === "security").length
  const errorCount = insights.filter((i) => i.category === "error").length
  const performanceCount = insights.filter((i) => i.category === "performance").length

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600"
      case "medium":
        return "text-amber-600"
      case "low":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "medium":
        return <Clock className="h-4 w-4 text-amber-600" />
      case "low":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md flex items-center">
          <Lightbulb className="mr-2 h-4 w-4" />
          Insights & Patterns
        </CardTitle>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerateInsights}
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
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyzing ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">Analyzing logs and generating insights...</div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="text-center text-xs text-muted-foreground">{analysisProgress}% complete</div>
          </div>
        ) : insights.length > 0 ? (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All Insights
                <Badge className="ml-2 bg-gray-500" variant="secondary">
                  {insights.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="security">
                Security
                <Badge className="ml-2 bg-red-500" variant="secondary">
                  {securityCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="errors">
                Errors
                <Badge className="ml-2 bg-amber-500" variant="secondary">
                  {errorCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="performance">
                Performance
                <Badge className="ml-2 bg-blue-500" variant="secondary">
                  {performanceCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {filteredInsights.length > 0 ? (
                filteredInsights.map((insight, index) => (
                  <div key={index} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        {getSeverityIcon(insight.severity)}
                        <h3 className={`text-sm font-medium ml-2 ${getSeverityColor(insight.severity)}`}>
                          {insight.title}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          insight.category === "security"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : insight.category === "error"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {insight.category}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>

                    {insight.relatedData && insight.relatedData.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-medium mb-2">Related Data</h4>
                        <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-24 overflow-y-auto">
                          {insight.relatedData.map((data, i) => (
                            <div key={i} className="mb-1 last:mb-0">
                              {data}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insight.recommendation && (
                      <div className="mb-3">
                        <h4 className="text-xs font-medium mb-1">Recommendation</h4>
                        <p className="text-xs text-muted-foreground">{insight.recommendation}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Detected {formatTimestamp(insight.timestamp, "UTC")}
                      </div>

                      <div className="flex items-center gap-2">
                        {insight.reviewed ? (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            {insight.helpful ? "Marked as helpful" : "Marked as not helpful"}
                          </Badge>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleMarkInsight(insight.id, true)}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Helpful
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleMarkInsight(insight.id, false)}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Not Helpful
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No insights found for this category</div>
              )}
            </div>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No insights available. Generate insights to see patterns and anomalies in your logs.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
