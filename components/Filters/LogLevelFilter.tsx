"use client"

import { useState, useEffect } from "react"
import type { LogLevelFilter as LogLevelFilterType } from "@/types/filters"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface LogLevelFilterProps {
  filter: LogLevelFilterType
  availableLogLevels: string[]
  onChange: (filter: LogLevelFilterType) => void
}

/**
 * Log Level Filter Component
 *
 * Allows filtering logs by log level (ERROR, WARNING, INFO, DEBUG, etc.)
 */
export function LogLevelFilter({ filter, availableLogLevels, onChange }: LogLevelFilterProps) {
  const [selectedLevels, setSelectedLevels] = useState<string[]>(filter.levels || [])

  // Update the filter when selected levels change
  useEffect(() => {
    onChange({
      ...filter,
      levels: selectedLevels,
    })
  }, [selectedLevels, filter, onChange])

  // Handle checkbox change
  const handleLevelChange = (level: string, checked: boolean) => {
    if (checked) {
      setSelectedLevels((prev) => [...prev, level])
    } else {
      setSelectedLevels((prev) => prev.filter((l) => l !== level))
    }
  }

  // Handle "select all" checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLevels(availableLogLevels)
    } else {
      setSelectedLevels([])
    }
  }

  // Color-code log levels
  const getLevelColor = (level: string) => {
    const upperLevel = level.toUpperCase()
    if (upperLevel.includes("ERROR") || upperLevel.includes("FATAL") || upperLevel.includes("CRITICAL")) {
      return "text-red-600"
    } else if (upperLevel.includes("WARN")) {
      return "text-amber-600"
    } else if (upperLevel.includes("INFO")) {
      return "text-cyan-600"
    } else if (upperLevel.includes("DEBUG") || upperLevel.includes("TRACE")) {
      return "text-teal-600"
    } else {
      return "text-gray-600"
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all-levels"
          checked={selectedLevels.length === availableLogLevels.length}
          onCheckedChange={handleSelectAll}
        />
        <Label htmlFor="select-all-levels">Select All</Label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {availableLogLevels.map((level) => (
          <div key={level} className="flex items-center space-x-2">
            <Checkbox
              id={`level-${level}`}
              checked={selectedLevels.includes(level)}
              onCheckedChange={(checked) => handleLevelChange(level, checked as boolean)}
            />
            <Label htmlFor={`level-${level}`} className={getLevelColor(level)}>
              {level}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
