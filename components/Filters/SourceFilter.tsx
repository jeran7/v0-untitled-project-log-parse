"use client"

import { useState, useEffect } from "react"
import type { SourceFilter as SourceFilterType } from "@/types/filters"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"

interface SourceFilterProps {
  filter: SourceFilterType
  availableSources: string[]
  onChange: (filter: SourceFilterType) => void
}

/**
 * Source Filter Component
 *
 * Allows filtering logs by source with search capability
 */
export function SourceFilter({ filter, availableSources, onChange }: SourceFilterProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>(filter.sources || [])
  const [searchText, setSearchText] = useState("")

  // Update the filter when selected sources change
  useEffect(() => {
    onChange({
      ...filter,
      sources: selectedSources,
    })
  }, [selectedSources, filter, onChange])

  // Handle checkbox change
  const handleSourceChange = (source: string, checked: boolean) => {
    if (checked) {
      setSelectedSources((prev) => [...prev, source])
    } else {
      setSelectedSources((prev) => prev.filter((s) => s !== source))
    }
  }

  // Handle "select all" checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSources(availableSources)
    } else {
      setSelectedSources([])
    }
  }

  // Filter sources based on search text
  const filteredSources = availableSources.filter((source) => source.toLowerCase().includes(searchText.toLowerCase()))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search sources..."
          className="pl-8"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all-sources"
          checked={selectedSources.length === availableSources.length}
          onCheckedChange={handleSelectAll}
        />
        <Label htmlFor="select-all-sources">Select All ({availableSources.length})</Label>
      </div>

      <ScrollArea className="h-60">
        <div className="space-y-1">
          {filteredSources.map((source) => (
            <div key={source} className="flex items-center space-x-2">
              <Checkbox
                id={`source-${source}`}
                checked={selectedSources.includes(source)}
                onCheckedChange={(checked) => handleSourceChange(source, checked as boolean)}
              />
              <Label htmlFor={`source-${source}`} className="truncate" title={source}>
                {source}
              </Label>
            </div>
          ))}

          {filteredSources.length === 0 && (
            <div className="py-4 text-center text-muted-foreground">No sources found matching "{searchText}"</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
