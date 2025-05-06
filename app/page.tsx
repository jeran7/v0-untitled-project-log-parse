import LogVisualizationDashboard from "@/components/LogVisualizationDashboard"

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Xage Security Log Visualization Tool</h1>
      <LogVisualizationDashboard />
    </main>
  )
}
