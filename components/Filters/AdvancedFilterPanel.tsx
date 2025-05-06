"use client"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import { useState, useEffect, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { debounce } from "lodash"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  FilterIcon,
  X,
  RefreshCw,
  CalendarIcon,
  AlertCircle,
  Check,
  Undo,
  Redo,
  BookmarkPlus,
} from "lucide-react"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import {
  addFilter,
  updateFilter,
  removeFilter,
  toggleFilterEnabled,
  saveFilterPreset,
  applyFilterPreset,
  deleteFilterPreset,
  undoFilterChange,
  redoFilterChange,
  setIsFiltering,
} from "@/lib/slices/filtersSlice"
import { updateFilters } from "@/lib/slices/logsSlice"

// Filter types
enum FilterType {
  TEXT = "text",
  REGEX = "regex",
  LOG_LEVEL = "logLevel",
  SOURCE = "source",
  TIMESTAMP = "timestamp",
  PRESET = "preset",
}

// Common security filter presets
const SECURITY_PRESETS = [
  {
    name: "Authentication Failures",
    filters: [
      { type: FilterType.TEXT, text: "authentication fail", caseSensitive: false, fields: ["message", "raw"] },
      { type: FilterType.TEXT, text: "login fail", caseSensitive: false, fields: ["message", "raw"] },
      { type: FilterType.TEXT, text: "invalid credentials", caseSensitive: false, fields: ["message", "raw"] },
    ],
  },
  {
    name: "Network Errors",
    filters: [
      { type: FilterType.TEXT, text: "connection refused", caseSensitive: false, fields: ["message", "raw"] },
      { type: FilterType.TEXT, text: "timeout", caseSensitive: false, fields: ["message", "raw"] },
      { type: FilterType.TEXT, text: "network error", caseSensitive: false, fields: ["message", "raw"] },
    ],
  },
  {
    name: "Security Alerts",
    filters: [
      { type: FilterType.LOG_LEVEL, levels: ["ERROR", "CRITICAL", "FATAL"] },
      { type: FilterType.TEXT, text: "security", caseSensitive: false, fields: ["message", "raw"] },
    ],
  },
  {
    name: "Access Control Issues",
    filters: [
      { type: FilterType.TEXT, text: "permission denied", caseSensitive: false, fields: ["message", "raw"] },
      { type: FilterType.TEXT, text: "unauthorized", caseSensitive: false, fields: ["message", "raw"] },
      { type: FilterType.TEXT, text: "access denied", caseSensitive: false, fields: ["message", "raw"] },
    ],
  },
]

export default function AdvancedFilterPanel() {
  const dispatch = useDispatch()
  const filters = useSelector((state: RootState) => state.filters.filters)
  const presets = useSelector((state: RootState) => state.filters.presets)
  const availableLogLevels = useSelector((state: RootState) => state.filters.availableLogLevels)
  const availableSources = useSelector((state: RootState) => state.filters.availableSources)
  const isFiltering = useSelector((state: RootState) => state.filters.isFiltering)
  const canUndo = useSelector((state: RootState) => state.filters.past.length > 0)
  const canRedo = useSelector((state: RootState) => state.filters.future.length > 0)

  const [activeTab, setActiveTab] = useState("filters")
  const [savePresetOpen, setSavePresetOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [activeFilterCount, setActiveFilterCount] = useState(0)
  const [regexError, setRegexError] = useState<string | null>(null)

  // Update active filter count when filters change
  useEffect(() => {
    setActiveFilterCount(filters.filter((f) => f.enabled).length)
  }, [filters])

  // Debounced filter application for performance
  const debouncedApplyFilters = useCallback(
    debounce((filters) => {
      // Extract filter values for the logs slice
      const textFilters = filters
        .filter((f) => f.enabled && (f.type === FilterType.TEXT || f.type === FilterType.REGEX))
        .map((f) => f.text || f.pattern)
        .filter(Boolean)

      const logLevelFilters = filters
        .filter((f) => f.enabled && f.type === FilterType.LOG_LEVEL)
        .flatMap((f) => f.levels || [])

      const sourceFilters = filters
        .filter((f) => f.enabled && f.type === FilterType.SOURCE)
        .flatMap((f) => f.sources || [])

      // Update the logs slice with the filter values
      dispatch(
        updateFilters({
          search: textFilters.join(" "),
          logLevel: logLevelFilters,
          source: sourceFilters,
        }),
      )

      // Set filtering state to false when done
      dispatch(setIsFiltering(false))
    }, 300),
    [dispatch],
  )

  // Apply filters when they change
  useEffect(() => {
    // Set filtering state to true
    dispatch(setIsFiltering(true))

    // Apply filters with debounce
    debouncedApplyFilters(filters)

    return () => {
      debouncedApplyFilters.cancel()
    }
  }, [filters, debouncedApplyFilters, dispatch])

  // Handle adding a new filter
  const handleAddFilter = (type: FilterType) => {
    switch (type) {
      case FilterType.TEXT:
        dispatch(
          addFilter({
            id: `text-${Date.now()}`,
            type: FilterType.TEXT,
            name: "Text Search",
            enabled: true,
            text: "",
            caseSensitive: false,
            fields: ["message", "raw"],
          }),
        )
        break
      case FilterType.REGEX:
        dispatch(
          addFilter({
            id: `regex-${Date.now()}`,
            type: FilterType.REGEX,
            name: "Regex Search",
            enabled: true,
            pattern: "",
            flags: "i",
            fields: ["message", "raw"],
          }),
        )
        break
      case FilterType.LOG_LEVEL:
        dispatch(
          addFilter({
            id: `level-${Date.now()}`,
            type: FilterType.LOG_LEVEL,
            name: "Log Level",
            enabled: true,
            levels: [],
          }),
        )
        break
      case FilterType.SOURCE:
        dispatch(
          addFilter({
            id: `source-${Date.now()}`,
            type: FilterType.SOURCE,
            name: "Source",
            enabled: true,
            sources: [],
          }),
        )
        break
      case FilterType.TIMESTAMP:
        dispatch(
          addFilter({
            id: `time-${Date.now()}`,
            type: FilterType.TIMESTAMP,
            name: "Time Range",
            enabled: true,
            range: {
              start: new Date(Date.now() - 24 * 60 * 60 * 1000),
              end: new Date(),
            },
          }),
        )
        break
    }
  }

  // Handle saving a filter preset
  const handleSavePreset = () => {
    if (!presetName.trim()) return

    dispatch(
      saveFilterPreset({
        name: presetName,
        filters: filters.filter((f) => f.enabled),
      }),
    )

    setPresetName("")
    setSavePresetOpen(false)
  }

  // Handle applying a security preset
  const handleApplySecurityPreset = (preset: (typeof SECURITY_PRESETS)[0]) => {
    // Clear existing filters first
    preset.filters.forEach((filterTemplate, index) => {
      const id = `preset-${Date.now()}-${index}`

      switch (filterTemplate.type) {
        case FilterType.TEXT:
          dispatch(
            addFilter({
              id,
              type: FilterType.TEXT,
              name: `${preset.name} - Text`,
              enabled: true,
              text: filterTemplate.text,
              caseSensitive: filterTemplate.caseSensitive,
              fields: filterTemplate.fields,
            }),
          )
          break
        case FilterType.LOG_LEVEL:
          dispatch(
            addFilter({
              id,
              type: FilterType.LOG_LEVEL,
              name: `${preset.name} - Level`,
              enabled: true,
              levels: filterTemplate.levels,
            }),
          )
          break
      }
    })
  }

  // Handle updating a filter
  const handleUpdateFilter = (filter: any) => {
    dispatch(updateFilter(filter))
  }

  // Handle removing a filter
  const handleRemoveFilter = (filterId: string) => {
    dispatch(removeFilter(filterId))
  }

  // Handle toggling a filter
  const handleToggleFilter = (filterId: string) => {
    dispatch(toggleFilterEnabled(filterId))
  }

  // Handle clearing all filters
  const handleClearFilters = () => {
    filters.forEach((filter) => {
      dispatch(removeFilter(filter.id))
    })
  }

  // Handle undo/redo
  const handleUndo = () => {
    dispatch(undoFilterChange())
  }

  const handleRedo = () => {
    dispatch(redoFilterChange())
  }

  // Render filter content based on type
  const renderFilterContent = (filter: any) => {
    switch (filter.type) {
      case FilterType.TEXT:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`text-${filter.id}`}>Search Text</Label>
              <Input
                id={`text-${filter.id}`}
                value={filter.text || ""}
                onChange={(e) => handleUpdateFilter({ ...filter, text: e.target.value })}
                placeholder="Enter text to search for..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`case-${filter.id}`}>Case Sensitive</Label>
              <Switch
                id={`case-${filter.id}`}
                checked={filter.caseSensitive}
                onCheckedChange={(checked) => handleUpdateFilter({ ...filter, caseSensitive: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Search In Fields</Label>
              <div className="flex flex-wrap gap-2">
                {["message", "raw", "level", "source"].map((field) => (
                  <Badge
                    key={field}
                    variant={filter.fields.includes(field) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const fields = filter.fields.includes(field)
                        ? filter.fields.filter((f: string) => f !== field)
                        : [...filter.fields, field]
                      handleUpdateFilter({ ...filter, fields })
                    }}
                  >
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )

      case FilterType.REGEX:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`regex-${filter.id}`}>Regex Pattern</Label>
              <Input
                id={`regex-${filter.id}`}
                value={filter.pattern || ""}
                onChange={(e) => {
                  try {
                    // Test if regex is valid
                    new RegExp(e.target.value, filter.flags)
                    setRegexError(null)
                    handleUpdateFilter({ ...filter, pattern: e.target.value })
                  } catch (err) {
                    setRegexError((err as Error).message)
                    handleUpdateFilter({ ...filter, pattern: e.target.value })
                  }
                }}
                placeholder="Enter regex pattern..."
                className={regexError ? "border-red-500" : ""}
              />
              {regexError && (
                <div className="text-xs text-red-500 mt-1">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {regexError}
                </div>
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
                    variant={filter.flags.includes(flag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const flags = filter.flags.includes(flag.id)
                        ? filter.flags.replace(flag.id, "")
                        : filter.flags + flag.id
                      handleUpdateFilter({ ...filter, flags })
                    }}
                  >
                    {flag.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Search In Fields</Label>
              <div className="flex flex-wrap gap-2">
                {["message", "raw", "level", "source"].map((field) => (
                  <Badge
                    key={field}
                    variant={filter.fields.includes(field) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const fields = filter.fields.includes(field)
                        ? filter.fields.filter((f: string) => f !== field)
                        : [...filter.fields, field]
                      handleUpdateFilter({ ...filter, fields })
                    }}
                  >
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )

      case FilterType.LOG_LEVEL:
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <Switch
                id={`select-all-${filter.id}`}
                checked={filter.levels.length === availableLogLevels.length && availableLogLevels.length > 0}
                onCheckedChange={(checked) => {
                  handleUpdateFilter({
                    ...filter,
                    levels: checked ? [...availableLogLevels] : [],
                  })
                }}
              />
              <Label htmlFor={`select-all-${filter.id}`}>Select All</Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableLogLevels.map((level) => {
                let className = "text-gray-700"

                // Color based on log level
                if (level.toUpperCase().includes("ERROR") || level.toUpperCase().includes("FATAL")) {
                  className = "text-red-600"
                } else if (level.toUpperCase().includes("WARN")) {
                  className = "text-amber-600"
                } else if (level.toUpperCase().includes("INFO")) {
                  className = "text-blue-600"
                } else if (level.toUpperCase().includes("DEBUG")) {
                  className = "text-green-600"
                }

                return (
                  <div key={level} className="flex items-center space-x-2">
                    <Switch
                      id={`level-${filter.id}-${level}`}
                      checked={filter.levels.includes(level)}
                      onCheckedChange={(checked) => {
                        const levels = checked
                          ? [...filter.levels, level]
                          : filter.levels.filter((l: string) => l !== level)
                        handleUpdateFilter({ ...filter, levels })
                      }}
                    />
                    <Label htmlFor={`level-${filter.id}-${level}`} className={className}>
                      {level}
                    </Label>
                  </div>
                )
              })}

              {availableLogLevels.length === 0 && (
                <div className="col-span-2 text-center text-gray-500 py-2">
                  No log levels found in the current dataset
                </div>
              )}
            </div>
          </div>
        )

      case FilterType.SOURCE:
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <Switch
                id={`select-all-${filter.id}`}
                checked={filter.sources.length === availableSources.length && availableSources.length > 0}
                onCheckedChange={(checked) => {
                  handleUpdateFilter({
                    ...filter,
                    sources: checked ? [...availableSources] : [],
                  })
                }}
              />
              <Label htmlFor={`select-all-${filter.id}`}>Select All</Label>
            </div>

            <div className="max-h-40 overflow-y-auto pr-2">
              {availableSources.map((source) => (
                <div key={source} className="flex items-center space-x-2 mb-1">
                  <Switch
                    id={`source-${filter.id}-${source}`}
                    checked={filter.sources.includes(source)}
                    onCheckedChange={(checked) => {
                      const sources = checked
                        ? [...filter.sources, source]
                        : filter.sources.filter((s: string) => s !== source)
                      handleUpdateFilter({ ...filter, sources })
                    }}
                  />
                  <Label htmlFor={`source-${filter.id}-${source}`} className="truncate" title={source}>
                    {source}
                  </Label>
                </div>
              ))}

              {availableSources.length === 0 && (
                <div className="text-center text-gray-500 py-2">No sources found in the current dataset</div>
              )}
            </div>
          </div>
        )

      case FilterType.TIMESTAMP:
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date/Time</Label>
                <div className="flex">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-10 rounded-r-none">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={filter.range.start}
                        onSelect={(date) => {
                          if (!date) return
                          const newDate = new Date(filter.range.start)
                          newDate.setFullYear(date.getFullYear())
                          newDate.setMonth(date.getMonth())
                          newDate.setDate(date.getDate())
                          handleUpdateFilter({
                            ...filter,
                            range: {
                              ...filter.range,
                              start: newDate,
                            },
                          })
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={formatTimestamp(filter.range.start.toISOString(), "UTC", "datetime")}
                    readOnly
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>End Date/Time</Label>
                <div className="flex">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-10 rounded-r-none">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={filter.range.end}
                        onSelect={(date) => {
                          if (!date) return
                          const newDate = new Date(filter.range.end)
                          newDate.setFullYear(date.getFullYear())
                          newDate.setMonth(date.getMonth())
                          newDate.setDate(date.getDate())
                          handleUpdateFilter({
                            ...filter,
                            range: {
                              ...filter.range,
                              end: newDate,
                            },
                          })
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={formatTimestamp(filter.range.end.toISOString(), "UTC", "datetime")}
                    readOnly
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Last 15 min", range: 15 * 60 * 1000 },
                  { label: "Last hour", range: 60 * 60 * 1000 },
                  { label: "Last 24h", range: 24 * 60 * 60 * 1000 },
                  { label: "Last 7 days", range: 7 * 24 * 60 * 60 * 1000 },
                  { label: "Last 30 days", range: 30 * 24 * 60 * 60 * 1000 },
                  { label: "All time", range: 365 * 24 * 60 * 60 * 1000 },
                ].map((option) => (
                  <Button
                    key={option.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const end = new Date()
                      const start = new Date(end.getTime() - option.range)
                      handleUpdateFilter({
                        ...filter,
                        range: { start, end },
                      })
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md flex items-center">
          <FilterIcon className="mr-2 h-4 w-4" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} active
            </Badge>
          )}
        </CardTitle>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="h-7" onClick={handleUndo} disabled={!canUndo}>
            <Undo className="h-3.5 w-3.5" />
          </Button>

          <Button variant="outline" size="sm" className="h-7" onClick={handleRedo} disabled={!canRedo}>
            <Redo className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.TEXT)}>Text Search</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.REGEX)}>Regex Search</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.LOG_LEVEL)}>Log Level</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.SOURCE)}>Source</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.TIMESTAMP)}>Time Range</DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Security Presets</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {SECURITY_PRESETS.map((preset) => (
                <DropdownMenuItem key={preset.name} onClick={() => handleApplySecurityPreset(preset)}>
                  {preset.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1" disabled={filters.length === 0}>
                <BookmarkPlus className="h-3.5 w-3.5" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Filter Preset</DialogTitle>
                <DialogDescription>Save your current filters as a preset for future use</DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Label htmlFor="preset-name">Preset Name</Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSavePresetOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePreset}>Save Preset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={handleClearFilters}
            disabled={filters.length === 0}
          >
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="filters" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="presets">Saved Presets</TabsTrigger>
            <TabsTrigger value="builder">Filter Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="filters">
            {filters.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No filters added. Click "Add Filter" to get started.
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={filters.map((f) => f.id)} className="space-y-2">
                {filters.map((filter) => (
                  <AccordionItem key={filter.id} value={filter.id} className="border rounded-md overflow-hidden">
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center">
                        <Switch
                          checked={filter.enabled}
                          onCheckedChange={() => handleToggleFilter(filter.id)}
                          className="mr-2"
                        />
                        <AccordionTrigger className="py-0 hover:no-underline">
                          <span className={`font-medium ${!filter.enabled ? "text-muted-foreground" : ""}`}>
                            {filter.name}
                          </span>
                        </AccordionTrigger>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFilter(filter.id)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <AccordionContent className="pt-2">{renderFilterContent(filter)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {isFiltering && (
              <div className="flex items-center justify-center mt-4 text-sm text-teal-700">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Applying filters...
              </div>
            )}
          </TabsContent>

          <TabsContent value="presets">
            {presets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No saved presets. Create filters and save them as presets.
              </div>
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {preset.filters.length} filter{preset.filters.length !== 1 && "s"}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => dispatch(applyFilterPreset(preset.id))}>
                        <Check className="h-4 w-4 mr-1" />
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500"
                        onClick={() => dispatch(deleteFilterPreset(preset.id))}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="builder">
            <div className="p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Filter Builder</h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Select defaultValue="AND">
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="text-sm text-muted-foreground">between all active filters</span>
                </div>

                <div className="space-y-2">
                  <Label>Active Filters</Label>
                  <div className="flex flex-wrap gap-2">
                    {filters
                      .filter((f) => f.enabled)
                      .map((filter) => (
                        <Badge key={filter.id} variant="secondary" className="py-1 px-3">
                          {filter.name}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 -mr-1"
                            onClick={() => handleToggleFilter(filter.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}

                    {filters.filter((f) => f.enabled).length === 0 && (
                      <div className="text-sm text-muted-foreground">No active filters</div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("filters")} className="mr-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Filter
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleClearFilters} disabled={filters.length === 0}>
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
