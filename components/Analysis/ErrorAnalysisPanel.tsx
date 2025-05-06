"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { analyzeErrors } from "@/lib/thunks/analysisThunks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, RefreshCw, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatTimestamp } from "@/lib/utils/timeUtils"

// Direct import from file
import BarChart from "@/components/Charts/BarChart"
import PieChart from "@/components/Charts/PieChart"

export default function ErrorAnalysisPanel({ className = "" }: { className?: string }) {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState("patterns")
  const [searchTerm, setSearchTerm] = useState("")

  // Get data from Redux store
  const errorPatterns = useSelector((state: RootState) => state.analysis.errorPatterns || [])
  const errorClusters = useSelector((state: RootState) => state.analysis.errorClusters || [])
  const errorTimeline = useSelector((state: RootState) => state.analysis.errorTimeline)
  const isAnalyzing = useSelector((state: RootState) => state.analysis.isAnalyzing)
  const analysisProgress = useSelector((state: RootState) => state.analysis.analysisProgress)
  const logs = useSelector((state: RootState) => state.logs.entries || {})

  // Handle analyzing errors
  const handleAnalyzeErrors = () => {
    dispatch(analyzeErrors())
  }

  // Filter error patterns based on search term
  const filteredErrorPatterns =
    errorPatterns && Array.isArray(errorPatterns)
      ? errorPatterns.filter(
          (pattern) =>
            pattern.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (pattern.examples &&
              Array.isArray(pattern.examples) &&
              pattern.examples.some((ex) => ex.toLowerCase().includes(searchTerm.toLowerCase()))),
        )
      : []

  // Filter error clusters based on search term
  const filteredErrorClusters =
    errorClusters && Array.isArray(errorClusters)
      ? errorClusters.filter(
          (cluster) =>
            cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cluster.examples &&
              Array.isArray(cluster.examples) &&
              cluster.examples.some((ex) => ex.toLowerCase().includes(searchTerm.toLowerCase()))),
        )
      : []

  // Prepare chart data for error distribution
  const prepareErrorDistributionData = () => {
    if (!errorPatterns || !Array.isArray(errorPatterns) || errorPatterns.length === 0) return []

    return errorPatterns.slice(0, 5).map((pattern) => ({
      name: pattern.pattern.length > 20 ? pattern.pattern.substring(0, 20) + "..." : pattern.pattern,
      value: pattern.count,
    }))
  }

  // Prepare pie chart data for error sources
  const prepareErrorSourcesData = () => {
    if (!errorPatterns || !Array.isArray(errorPatterns) || errorPatterns.length === 0) return []

    const sourceMap = new Map<string, number>()

    errorPatterns.forEach((pattern) => {
      if (pattern.sources && Array.isArray(pattern.sources)) {
        pattern.sources.forEach((source) => {
          if (source && source.source) {
            sourceMap.set(source.source, (sourceMap.get(source.source) || 0) + source.count)
          }
        })
      }
    })

    return Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({
        name: source || "Unknown",
        value: count,
        color: "#DC2626",
      }))
  }

  // Safe format timestamp function
  const safeFormatTimestamp = (timestamp: string | undefined | null) => {
    if (!timestamp) return "N/A"
    try {
      return formatTimestamp(timestamp, "UTC")
    } catch (error) {
      console.error("Error formatting timestamp:", error)
      return "Invalid Date"
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md flex items-center">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Error Analysis
        </CardTitle>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleAnalyzeErrors}
            disabled={isAnalyzing || !logs || Object.keys(logs).length === 0}
            className="bg-red-600 hover:bg-red-700"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Analyze Errors
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyzing ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">Analyzing error patterns...</div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="text-center text-xs text-muted-foreground">{analysisProgress}% complete</div>
          </div>
        ) : errorPatterns && errorPatterns.length > 0 ? (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search error patterns..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="patterns" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
                <TabsTrigger value="clusters">Error Clusters</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
              </TabsList>

              <TabsContent value="patterns" className="mt-0">
                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                  <div className="space-y-4">
                    {filteredErrorPatterns.length > 0 ? (
                      filteredErrorPatterns.map((pattern, index) => (
                        <div key={index} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-medium text-red-600">
                              Pattern #{index + 1}: {pattern.count} occurrences
                            </h3>
                          </div>

                          <p className="text-sm font-mono bg-gray-100 p-2 rounded mb-3">{pattern.pattern}</p>

                          <div className="mb-3">
                            <h4 className="text-xs font-medium mb-2">Examples</h4>
                            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-24 overflow-y-auto">
                              {pattern.examples && Array.isArray(pattern.examples) ? (
                                pattern.examples.map((example, i) => (
                                  <div key={i} className="mb-1 last:mb-0 font-mono">
                                    {example}
                                  </div>
                                ))
                              ) : (
                                <div>No examples available</div>
                              )}
                            </div>
                          </div>

                          {pattern.sources && pattern.sources.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-xs font-medium mb-2">Sources</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {pattern.sources.map((source, i) => (
                                  <div key={i} className="text-xs">
                                    <span className="font-medium">{source.source || "Unknown"}</span>: {source.count}{" "}
                                    occurrences
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {pattern.timeDistribution && (
                            <div>
                              <h4 className="text-xs font-medium mb-2">Time Distribution</h4>
                              <div className="text-xs">
                                First seen: {safeFormatTimestamp(pattern.timeDistribution.firstSeen)}
                                <br />
                                Last seen: {safeFormatTimestamp(pattern.timeDistribution.lastSeen)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No error patterns match your search</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="clusters" className="mt-0">
                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                  <div className="space-y-4">
                    {filteredErrorClusters.length > 0 ? (
                      filteredErrorClusters.map((cluster, index) => (
                        <div key={index} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-medium text-red-600">Cluster: {cluster.name}</h3>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              {cluster.count} errors
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">{cluster.description}</p>

                          <div className="mb-3">
                            <h4 className="text-xs font-medium mb-2">Examples</h4>
                            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-24 overflow-y-auto">
                              {cluster.examples && Array.isArray(cluster.examples) ? (
                                cluster.examples.map((example, i) => (
                                  <div key={i} className="mb-1 last:mb-0 font-mono">
                                    {example}
                                  </div>
                                ))
                              ) : (
                                <div>No examples available</div>
                              )}
                            </div>
                          </div>

                          {cluster.recommendation && (
                            <div className="mb-3">
                              <h4 className="text-xs font-medium mb-2">Recommendation</h4>
                              <p className="text-xs text-muted-foreground">{cluster.recommendation}</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No error clusters match your search</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="distribution" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-4">Top Error Patterns</h3>
                    <div className="h-64">
                      <BarChart data={prepareErrorDistributionData()} color="#DC2626" />
                    </div>
                  </div>

                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-4">Error Sources</h3>
                    <div className="h-64">
                      <PieChart data={prepareErrorSourcesData()} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No error analysis available. Analyze errors to see patterns and clusters.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
