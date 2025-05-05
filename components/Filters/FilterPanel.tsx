"use client"

import { useState, useEffect, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import type { Filter, FilterPanelProps } from "@/types/filters"
import {
  addFilter,
  updateFilter,
  removeFilter,
  toggleFilterEnabled,
  setFilters,
  saveFilterPreset,
  applyFilterPreset,
  deleteFilterPreset,
} from "@/lib/slices/filtersSlice"
import { FilterType } from "@/types/filters"
import { debounce } from "lodash"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { LogLevelFilter } from "./LogLevelFilter"
import { SourceFilter } from "./SourceFilter"
import { TextFilter } from "./TextFilter"
import { RegexFilter } from "./RegexFilter"
import { TimestampFilter } from "./TimestampFilter"
import { SavedFilterList } from "./SavedFilterList"
import { Plus, Save, FilterIcon, X, RefreshCw } from "lucide-react"

/**
 * FilterPanel Component
 *
 * Advanced filtering system with support for:
 * - Multiple filter types (log level, source, text, regex, timestamp)
 * - Saving and loading filter presets
 * - Filter enabling/disabling
 * - Real-time filtering with optimization for large datasets
 */
export default function FilterPanel({ className = "" }: Partial<FilterPanelProps>) {
  const dispatch = useDispatch()
  const filters = useSelector((state: RootState) => state.filters.filters)
  const presets = useSelector((state: RootState) => state.filters.presets)
  const availableLogLevels = useSelector((state: RootState) => state.filters.availableLogLevels)
  const availableSources = useSelector((state: RootState) => state.filters.availableSources)
  const isFiltering = useSelector((state: RootState) => state.filters.isFiltering)

  const [savePresetOpen, setSavePresetOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType | null>(null)
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  // Update active filter count when filters change
  useEffect(() => {
    setActiveFilterCount(filters.filter((f) => f.enabled).length)
  }, [filters])

  /**
   * Handler for saving filter presets
   */
  const handleSavePreset = () => {
    if (presetName.trim() === "") return

    dispatch(
      saveFilterPreset({
        name: presetName,
        filters: filters,
      }),
    )

    setPresetName("")
    setSavePresetOpen(false)
  }

  /**
   * Handler for adding new filters
   */
  const handleAddFilter = (type: FilterType) => {
    // Close the dropdown
    setSelectedFilterType(null)

    switch (type) {
      case FilterType.LOG_LEVEL:
        dispatch(
          addFilter({
            type: FilterType.LOG_LEVEL,
            name: "Log Level",
            enabled: true,
            levels: availableLogLevels,
          }),
        )
        break

      case FilterType.SOURCE:
        dispatch(
          addFilter({
            type: FilterType.SOURCE,
            name: "Source",
            enabled: true,
            sources: [],
          }),
        )
        break

      case FilterType.TEXT:
        dispatch(
          addFilter({
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
            type: FilterType.REGEX,
            name: "Regex Search",
            enabled: true,
            pattern: "",
            flags: "i", // Case insensitive by default
            fields: ["message", "raw"],
          }),
        )
        break

      case FilterType.TIMESTAMP:
        dispatch(
          addFilter({
            type: FilterType.TIMESTAMP,
            name: "Timestamp",
            enabled: true,
            range: {
              start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              end: new Date(),
            },
          }),
        )
        break
    }
  }

  /**
   * Handler for removing filters
   */
  const handleRemoveFilter = (filterId: string) => {
    dispatch(removeFilter(filterId))
  }

  /**
   * Handler for toggling filter enabled state
   */
  const handleToggleFilterEnabled = (filterId: string) => {
    dispatch(toggleFilterEnabled(filterId))
  }

  /**
   * Handler for updating filters (debounced to prevent excessive updates)
   */
  const handleUpdateFilter = useCallback(
    debounce((filter: Filter) => {
      dispatch(updateFilter(filter))
    }, 300),
    [dispatch],
  )

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    dispatch(setFilters([]))
  }

  /**
   * Get filter component based on type
   */
  const renderFilterComponent = (filter: Filter) => {
    switch (filter.type) {
      case FilterType.LOG_LEVEL:
        return <LogLevelFilter filter={filter} availableLogLevels={availableLogLevels} onChange={handleUpdateFilter} />

      case FilterType.SOURCE:
        return <SourceFilter filter={filter} availableSources={availableSources} onChange={handleUpdateFilter} />

      case FilterType.TEXT:
        return <TextFilter filter={filter} onChange={handleUpdateFilter} />

      case FilterType.REGEX:
        return <RegexFilter filter={filter} onChange={handleUpdateFilter} />

      case FilterType.TIMESTAMP:
        return <TimestampFilter filter={filter} onChange={handleUpdateFilter} />

      default:
        return null
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md flex items-center">
          <FilterIcon className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} active
            </Badge>
          )}
        </CardTitle>

        <div className="flex items-center space-x-2">
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
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.LOG_LEVEL)}>Log Level</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.SOURCE)}>Source</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.TEXT)}>Text Search</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.REGEX)}>Regex Search</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFilter(FilterType.TIMESTAMP)}>Timestamp</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1" disabled={filters.length === 0}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Filter Preset</DialogTitle>
                <DialogDescription>Save your current filters as a preset for future use.</DialogDescription>
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
        <Tabs defaultValue="filters">
          <TabsList className="mb-4">
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="presets">Saved Presets</TabsTrigger>
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
                          onCheckedChange={() => handleToggleFilterEnabled(filter.id)}
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
                    <AccordionContent className="pt-2">{renderFilterComponent(filter)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="presets">
            <SavedFilterList
              presets={presets}
              onApplyPreset={(presetId) => dispatch(applyFilterPreset(presetId))}
              onDeletePreset={(presetId) => dispatch(deleteFilterPreset(presetId))}
            />
          </TabsContent>
        </Tabs>

        {isFiltering && (
          <div className="flex items-center justify-center mt-4 text-sm text-teal-700">
            <div className="animate-spin mr-2">
              <RefreshCw className="h-4 w-4" />
            </div>
            Filtering logs...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
