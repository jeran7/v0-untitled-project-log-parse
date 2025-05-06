"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { analyzeSecurityIssues } from "@/lib/thunks/analysisThunks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, RefreshCw, Search, AlertTriangle, Info, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatTimestamp } from "@/lib/utils/timeUtils"

// Direct import from file
import BarChart from "@/components/Charts/BarChart"

export default function SecurityAnalysisPanel({ className = "" }: { className?: string }) {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState("issues")
  const [searchTerm, setSearchTerm] = useState("")

  // Get data from Redux store
  const securityIssues = useSelector((state: RootState) => state.analysis.securityIssues)
  const isAnalyzing = useSelector((state: RootState) => state.analysis.isAnalyzing)
  const analysisProgress = useSelector((state: RootState) => state.analysis.analysisProgress)
  const logs = useSelector((state: RootState) => state.logs.entries)

  // Handle analyzing security issues
  const handleAnalyzeSecurityIssues = () => {
    dispatch(analyzeSecurityIssues())
  }

  // Filter security issues based on search term
  const filteredSecurityIssues = securityIssues.filter(
    (issue) =>
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.examples.some((ex) => ex.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Filter security issues by severity
  const highSeverityIssues = filteredSecurityIssues.filter((issue) => issue.severity === "high")
  const mediumSeverityIssues = filteredSecurityIssues.filter((issue) => issue.severity === "medium")
  const lowSeverityIssues = filteredSecurityIssues.filter((issue) => issue.severity === "low")

  // Prepare chart data for security issues by type
  const prepareSecurityIssuesByTypeData = () => {
    if (!securityIssues.length) return []

    const typeMap = new Map<string, number>()

    securityIssues.forEach((issue) => {
      typeMap.set(issue.type, (typeMap.get(issue.type) || 0) + 1)
    })

    return Array.from(typeMap.entries()).map(([type, count]) => ({
      name: type,
      value: count,
    }))
  }

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "medium":
        return <Info className="h-4 w-4 text-amber-600" />
      case "low":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

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

  // Get severity background color
  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-amber-100 text-amber-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md flex items-center">
          <Shield className="mr-2 h-4 w-4" />
          Security Analysis
        </CardTitle>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleAnalyzeSecurityIssues}
            disabled={isAnalyzing || Object.keys(logs).length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Analyze Security
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyzing ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">Analyzing security issues...</div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="text-center text-xs text-muted-foreground">{analysisProgress}% complete</div>
          </div>
        ) : securityIssues.length > 0 ? (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search security issues..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="issues" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="issues">All Issues</TabsTrigger>
                <TabsTrigger value="high">
                  High Severity
                  <span className="ml-2 bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full text-xs">
                    {highSeverityIssues.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="medium">
                  Medium Severity
                  <span className="ml-2 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-xs">
                    {mediumSeverityIssues.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="low">
                  Low Severity
                  <span className="ml-2 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                    {lowSeverityIssues.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="issues" className="mt-0">
                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                  <div className="space-y-4">
                    {filteredSecurityIssues.length > 0 ? (
                      filteredSecurityIssues.map((issue, index) => (
                        <div key={index} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              {getSeverityIcon(issue.severity)}
                              <h3 className={`text-sm font-medium ml-2 ${getSeverityColor(issue.severity)}`}>
                                {issue.title}
                              </h3>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityBgColor(issue.severity)}`}>
                              {issue.severity} severity
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>

                          <div className="mb-3">
                            <h4 className="text-xs font-medium mb-2">Examples</h4>
                            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-24 overflow-y-auto">
                              {issue.examples.map((example, i) => (
                                <div key={i} className="mb-1 last:mb-0 font-mono">
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>

                          {issue.recommendation && (
                            <div className="mb-3">
                              <h4 className="text-xs font-medium mb-2">Recommendation</h4>
                              <p className="text-xs text-muted-foreground">{issue.recommendation}</p>
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-2 pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Detected {formatTimestamp(issue.timestamp, "UTC")}
                            </div>
                            <div className="text-xs font-medium">Type: {issue.type}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No security issues match your search</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="high" className="mt-0">
                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                  <div className="space-y-4">
                    {highSeverityIssues.length > 0 ? (
                      highSeverityIssues.map((issue, index) => (
                        <div key={index} className="border border-red-200 rounded-md p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <h3 className="text-sm font-medium ml-2 text-red-600">{issue.title}</h3>
                            </div>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              high severity
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>

                          <div className="mb-3">
                            <h4 className="text-xs font-medium mb-2">Examples</h4>
                            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-24 overflow-y-auto">
                              {issue.examples.map((example, i) => (
                                <div key={i} className="mb-1 last:mb-0 font-mono">
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>

                          {issue.recommendation && (
                            <div className="mb-3">
                              <h4 className="text-xs font-medium mb-2">Recommendation</h4>
                              <p className="text-xs text-muted-foreground">{issue.recommendation}</p>
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-2 pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Detected {formatTimestamp(issue.timestamp, "UTC")}
                            </div>
                            <div className="text-xs font-medium">Type: {issue.type}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No high severity security issues found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="medium" className="mt-0">
                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                  <div className="space-y-4">
                    {mediumSeverityIssues.length > 0 ? (
                      mediumSeverityIssues.map((issue, index) => (
                        <div key={index} className="border border-amber-200 rounded-md p-4">
                          {/* Similar content structure as high severity */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <Info className="h-4 w-4 text-amber-600" />
                              <h3 className="text-sm font-medium ml-2 text-amber-600">{issue.title}</h3>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              medium severity
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>

                          <div className="mb-3">
                            <h4 className="text-xs font-medium mb-2">Examples</h4>
                            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-24 overflow-y-auto">
                              {issue.examples.map((example, i) => (
                                <div key={i} className="mb-1 last:mb-0 font-mono">
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>

                          {issue.recommendation && (
                            <div className="mb-3">
                              <h4 className="text-xs font-medium mb-2">Recommendation</h4>
                              <p className="text-xs text-muted-foreground">{issue.recommendation}</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No medium severity security issues found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="low" className="mt-0">
                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                  <div className="space-y-4">
                    {lowSeverityIssues.length > 0 ? (
                      lowSeverityIssues.map((issue, index) => (
                        <div key={index} className="border border-blue-200 rounded-md p-4">
                          {/* Similar content structure as high severity */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <h3 className="text-sm font-medium ml-2 text-blue-600">{issue.title}</h3>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              low severity
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>

                          <div className="mb-3">
                            <h4 className="text-xs font-medium mb-2">Examples</h4>
                            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-24 overflow-y-auto">
                              {issue.examples.map((example, i) => (
                                <div key={i} className="mb-1 last:mb-0 font-mono">
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No low severity security issues found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="stats" className="mt-0">
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-4">Security Issues by Type</h3>
                  <div className="h-64">
                    <BarChart data={prepareSecurityIssuesByTypeData()} color="#3B82F6" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="border rounded-md p-4 bg-red-50">
                    <h3 className="text-sm font-medium mb-2 text-red-600">High Severity</h3>
                    <div className="text-2xl font-bold text-red-600">{highSeverityIssues.length}</div>
                    <div className="text-xs text-red-600 mt-1">
                      {highSeverityIssues.length > 0 ? "Requires immediate attention" : "No critical issues found"}
                    </div>
                  </div>

                  <div className="border rounded-md p-4 bg-amber-50">
                    <h3 className="text-sm font-medium mb-2 text-amber-600">Medium Severity</h3>
                    <div className="text-2xl font-bold text-amber-600">{mediumSeverityIssues.length}</div>
                    <div className="text-xs text-amber-600 mt-1">
                      {mediumSeverityIssues.length > 0 ? "Should be addressed soon" : "No medium issues found"}
                    </div>
                  </div>

                  <div className="border rounded-md p-4 bg-blue-50">
                    <h3 className="text-sm font-medium mb-2 text-blue-600">Low Severity</h3>
                    <div className="text-2xl font-bold text-blue-600">{lowSeverityIssues.length}</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {lowSeverityIssues.length > 0 ? "Can be addressed later" : "No low issues found"}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No security analysis available. Analyze security issues to see potential vulnerabilities.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
