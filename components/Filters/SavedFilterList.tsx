"use client"

import type { FilterPreset } from "@/types/filters"
import { Button } from "@/components/ui/button"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import { Check, Trash2 } from "lucide-react"

interface SavedFilterListProps {
  presets: FilterPreset[]
  onApplyPreset: (id: string) => void
  onDeletePreset: (id: string) => void
}

/**
 * Saved Filter List Component
 *
 * Displays saved filter presets and allows applying or deleting them
 */
export function SavedFilterList({ presets, onApplyPreset, onDeletePreset }: SavedFilterListProps) {
  if (presets.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No saved presets. Save a filter configuration to create a preset.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {presets.map((preset) => (
        <div key={preset.id} className="flex items-center justify-between p-3 border rounded-md">
          <div className="space-y-1">
            <div className="font-medium">{preset.name}</div>
            <div className="text-xs text-muted-foreground">
              Created: {formatTimestamp(preset.createdAt.toISOString(), "UTC", "datetime")}
              {preset.lastUsed && (
                <> • Last used: {formatTimestamp(preset.lastUsed.toISOString(), "UTC", "datetime")}</>
              )}
            </div>
            <div className="text-xs">
              {preset.filters.length} filter{preset.filters.length !== 1 && "s"}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onApplyPreset(preset.id)}
              aria-label="Apply Preset"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDeletePreset(preset.id)}
              aria-label="Delete Preset"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
