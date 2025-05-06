"use client"

import { useState } from "react"
import { useSelector } from "react-redux"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import type { RootState } from "@/lib/store"
import ErrorAnalysisPanel from "./ErrorAnalysisPanel"
import StatisticalDashboard from "./StatisticalDashboard"
import InsightsPanel from "./InsightsPanel"
import SecurityAnalysisPanel from "./SecurityAnalysisPanel"

export default function AnalysisDashboard() {
  const [activeTab, setActiveTab] = useState("insights")
  const isAnalyzing = useSelector((state: RootState) => state.analysis.isAnalyzing)

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardContent className="p-0">
        <Tabs defaultValue="insights" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-4">
            <TabsList className="h-12">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="errors">Error Analysis</TabsTrigger>
              <TabsTrigger value="security">Security Analysis</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <TabsContent value="insights" className="mt-0 h-full">
              <InsightsPanel className="h-full" />
            </TabsContent>

            <TabsContent value="errors" className="mt-0 h-full">
              <ErrorAnalysisPanel className="h-full" />
            </TabsContent>

            <TabsContent value="security" className="mt-0 h-full">
              <SecurityAnalysisPanel className="h-full" />
            </TabsContent>

            <TabsContent value="statistics" className="mt-0 h-full">
              <StatisticalDashboard className="h-full" />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
