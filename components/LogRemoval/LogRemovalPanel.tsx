"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { removeLogEntries, removeLogEntriesByFilter, undoRemoval } from "@/lib/slices/logsSlice"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, UndoIcon, AlertTriangle, Search } from "lucide-react"
import { formatTimestamp } from "@/lib/utils/timeUtils"

export default function LogRemovalPanel() {
  const dispatch = useDispatch()
  const logs = useSelector((state: RootState) => state.logs.entries)
  const filters = useSelector((state: RootState) => state.filters.filters)
  const removedCount = useSelector((state: RootState) => state.logs.removedCount)
  const removedEntries = useSelector((state: RootState) => state.logs.removedEntries)
  const activeLogEntry = useSelector((state: RootState) => state.logs.activeLogEntry)

  const [activeTab, setActiveTab] = useState("text")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [removalOperation, setRemovalOperation] = useState<{
    type: "text" | "regex" | "selected" | "filtered"
    payload: any
    description: string
    count: number
  } | null>(null)

  // Text removal state
  const [textToRemove, setTextToRemove] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)

  // Regex removal state
  const [regexPattern, setRegexPattern] = useState("")
  const [regexFlags, setRegexFlags] = useState("i")
  const [regexError, setRegexError] = useState<string | null>(null)

  // Count logs that would be removed by current criteria
  const countLogsToRemove = () => {
    let count = 0

    switch (activeTab) {
      case "text":
        if (!textToRemove) return 0

        Object.values(logs).forEach((log) => {
          const text = caseSensitive ? textToRemove : textToRemove.toLowerCase()
          const message = caseSensitive ? log.message : log.message?.toLowerCase()
          const raw = caseSensitive ? log.raw : log.raw?.toLowerCase()

          if ((message && message.includes(text)) || (raw && raw.includes(text))) {
            count++
          }
        })
        break

      case "regex":
        if (!regexPattern || regexError) return 0

        try {
          const regex = new RegExp(regexPattern, regexFlags)

          Object.values(logs).forEach((log) => {
            if ((log.message && regex.test(log.message)) || (log.raw && regex.test(log.raw))) {
              count++
            }
          })
        } catch (e) {
          // Invalid regex
          return 0
        }
        break

      case "selected":
        return activeLogEntry ? 1 : 0

      case "filtered":
        // Count logs that match current filters
        if (filters.length === 0) return 0

        // This is an approximation - the actual filtering logic is more complex
        // For a more accurate count, we would need to replicate the filter logic here
        const activeFilters = filters.filter((f) => f.enabled)
        if (activeFilters.length === 0) return 0

        // For simplicity, we'll just return a percentage of total logs based on active filters
        // In a real implementation, you would apply the actual filter logic
        return Math.floor(Object.keys(logs).length * 0.3)
    }

    return count
  }

  // Handle regex pattern change with validation
  const handleRegexChange = (pattern: string) => {
    setRegexPattern(pattern)

    if (!pattern) {
      setRegexError(null)
      return
    }

    try {
      new RegExp(pattern, regexFlags)
      setRegexError(null)
    } catch (e) {
      setRegexError((e as Error).message)
    }
  }

  // Prepare removal operation and show confirmation dialog
  const prepareRemoval = (type: "text" | "regex" | "selected" | "filtered") => {
    let payload: any
    let description = ""
    let count = 0

    switch (type) {
      case "text":
        if (!textToRemove) return

        payload = {
          text: textToRemove,
          caseSensitive,
        }
        description = `Removed logs containing "${textToRemove}"`
        count = countLogsToRemove()
        break

      case "regex":
        if (!regexPattern || regexError) return

        payload = {
          regex: {
            pattern: regexPattern,
            flags: regexFlags,
          },
        }
        description = `Removed logs matching regex /${regexPattern}/${regexFlags}`
        count = countLogsToRemove()
        break

      case "selected":
        if (!activeLogEntry) return

        payload = {
          ids: [activeLogEntry],
        }
        description = "Removed selected log entry"
        count = 1
        break

      case "filtered":
        // Get active filters
        const activeFilters = filters.filter((f) => f.enabled)
        if (activeFilters.length === 0) return

        // Convert filters to the format expected by removeLogEntriesByFilter
        const filterPayload: any = {}

        activeFilters.forEach((filter) => {
          switch (filter.type) {
            case "text":
              filterPayload.text = filter.text
              break
            case "regex":
              filterPayload.regex = {
                pattern: filter.pattern,
                flags: filter.flags,
              }
              break
            case "logLevel":
              filterPayload.logLevel = filter.levels
              break
            case "source":
              filterPayload.source = filter.sources
              break
            case "timestamp":
              filterPayload.timeRange = filter.range
              break
          }
        })

        payload = filterPayload
        description = "Removed logs matching current filters"
        count = countLogsToRemove()
        break
    }

    if (count > 0) {
      setRemovalOperation({
        type,
        payload,
        description,
        count,
      })
      setConfirmDialogOpen(true)
    }
  }

  // Execute removal operation
  const executeRemoval = () => {
    if (!removalOperation) return

    switch (removalOperation.type) {
      case "text":
        dispatch(
          removeLogEntriesByFilter({
            filter: {
              text: removalOperation.payload.text,
            },
            description: removalOperation.description,
          }),
        )
        break

      case "regex":
        dispatch(
          removeLogEntriesByFilter({
            filter: {
              regex: removalOperation.payload.regex,
            },
            description: removalOperation.description,
          }),
        )
        break

      case "selected":
        dispatch(
          removeLogEntries({
            ids: removalOperation.payload.ids,
            description: removalOperation.description,
          }),
        )
        break

      case "filtered":
        dispatch(
          removeLogEntriesByFilter({
            filter: removalOperation.payload,
            description: removalOperation.description,
          }),
        )
        break
    }

    setConfirmDialogOpen(false)
    setRemovalOperation(null)
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md flex items-center">
          <Trash2 className="mr-2 h-4 w-4" />
          Log Removal
          {removedCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {removedCount} removed
            </Badge>
          )}
        </CardTitle>

        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(undoRemoval())}
          disabled={removedEntries.length === 0}
        >
          <UndoIcon className="h-3.5 w-3.5 mr-1" />
          Undo
        </Button>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="regex">Regex</TabsTrigger>
            <TabsTrigger value="selected">Selected</TabsTrigger>
            <TabsTrigger value="filtered">Filtered</TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-to-remove">Remove logs containing text:</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="text-to-remove"
                    value={textToRemove}
                    onChange={(e) => setTextToRemove(e.target.value)}
                    placeholder="Enter text to remove..."
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="case-sensitive" checked={caseSensitive} onCheckedChange={setCaseSensitive} />
                <Label htmlFor="case-sensitive">Case sensitive</Label>
              </div>

              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={() => prepareRemoval("text")}
                  disabled={!textToRemove || countLogsToRemove() === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove {countLogsToRemove() > 0 ? `(${countLogsToRemove()})` : ""}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="regex">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="regex-pattern">Remove logs matching regex:</Label>
                <Input
                  id="regex-pattern"
                  value={regexPattern}
                  onChange={(e) => handleRegexChange(e.target.value)}
                  placeholder="Enter regex pattern..."
                  className={regexError ? "border-red-500" : ""}
                />
                {regexError && (
                  <p className="text-xs text-red-500">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    {regexError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Regex Flags</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "i", name: "Case Insensitive" },
                    { id: "g", name: "Global" },
                    { id: "m", name: "Multiline" },
                  ].map((flag) => (
                    <Badge
                      key={flag.id}
                      variant={regexFlags.includes(flag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const newFlags = regexFlags.includes(flag.id)
                          ? regexFlags.replace(flag.id, "")
                          : regexFlags + flag.id
                        setRegexFlags(newFlags)
                      }}
                    >
                      {flag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={() => prepareRemoval("regex")}
                  disabled={!regexPattern || regexError !== null || countLogsToRemove() === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove {countLogsToRemove() > 0 ? `(${countLogsToRemove()})` : ""}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="selected">
            <div className="space-y-4">
              {activeLogEntry ? (
                <div className="border rounded-md p-3">
                  <p className="font-medium">Selected Log Entry:</p>
                  <p className="text-sm truncate text-muted-foreground">
                    {logs[activeLogEntry]?.message || logs[activeLogEntry]?.raw || "Log entry"}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No log entry selected. Click on a log entry to select it.
                </div>
              )}

              <div className="pt-2">
                <Button variant="destructive" onClick={() => prepareRemoval("selected")} disabled={!activeLogEntry}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected Entry
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="filtered">
            <div className="space-y-4">
              <div className="border rounded-md p-3">
                <p className="font-medium">Active Filters:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters
                    .filter((f) => f.enabled)
                    .map((filter) => (
                      <Badge key={filter.id} variant="secondary">
                        {filter.name}
                      </Badge>
                    ))}

                  {filters.filter((f) => f.enabled).length === 0 && (
                    <p className="text-sm text-muted-foreground">No active filters</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={() => prepareRemoval("filtered")}
                  disabled={filters.filter((f) => f.enabled).length === 0 || countLogsToRemove() === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Filtered Logs {countLogsToRemove() > 0 ? `(~${countLogsToRemove()})` : ""}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {removedEntries.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <p className="text-sm font-medium mb-2">Recent Removals:</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {removedEntries
                .slice()
                .reverse()
                .map((removal, index) => (
                  <div key={index} className="text-xs flex justify-between items-center p-2 border rounded-md">
                    <div>
                      <span className="font-medium">{removal.description}</span>
                      <span className="text-muted-foreground ml-2">
                        ({Object.keys(removal.entries).length} entries)
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatTimestamp(new Date(removal.timestamp).toISOString(), "UTC", "time")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Log Removal</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently remove {removalOperation?.count} log{" "}
              {removalOperation?.count === 1 ? "entry" : "entries"}. This action cannot be undone (except for the last{" "}
              {10} removal operations).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeRemoval} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
