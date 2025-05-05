"use client"

import { useState, useEffect } from "react"
import type { RegexFilter as RegexFilterType } from "@/types/filters"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface RegexFilterProps {
  filter: RegexFilterType
  onChange: (filter: RegexFilterType) => void
}

/**
 * Regex Filter Component
 *
 * Allows filtering logs by regex patterns with flag options
 * and validation of regex patterns
 */
export function RegexFilter({ filter, onChange }: RegexFilterProps) {
  const [pattern, setPattern] = useState(filter.pattern || "")
  const [flags, setFlags] = useState(filter.flags || "i")
  const [fields, setFields] = useState<string[]>(filter.fields || ["message", "raw"])
  const [error, setError] = useState<string | null>(null)

  // Validate regex and update filter
  useEffect(() => {
    if (pattern) {
      try {
        // Test if the regex is valid
        new RegExp(pattern, flags)
        setError(null)

        // Update the filter
        onChange({
          ...filter,
          pattern,
          flags,
          fields,
        })
      } catch (e) {
        setError((e as Error).message)
      }
    } else {
      setError(null)
      onChange({
        ...filter,
        pattern,
        flags,
        fields,
      })
    }
  }, [pattern, flags, fields, filter, onChange])

  // Toggle search fields
  const toggleField = (field: string) => {
    if (fields.includes(field)) {
      setFields(fields.filter((f) => f !== field))
    } else {
      setFields([...fields, field])
    }
  }

  // Toggle regex flags
  const toggleFlag = (flag: string) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ""))
    } else {
      setFlags(flags + flag)
    }
  }

  // Common searchable fields
  const availableFields = [
    { id: "message", name: "Message" },
    { id: "raw", name: "Raw Log" },
    { id: "level", name: "Level" },
    { id: "source", name: "Source" },
  ]

  // Available regex flags
  const availableFlags = [
    { id: "i", name: "Case Insensitive", description: "Makes the regex case insensitive" },
    { id: "g", name: "Global", description: "Find all matches" },
    { id: "m", name: "Multiline", description: "^ and $ match start/end of each line" },
    { id: "s", name: "Dot All", description: "Dot matches newlines" },
  ]

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="regex-pattern">Regex Pattern</Label>
        <Input
          id="regex-pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Enter regex pattern..."
          className={error ? "border-red-500" : ""}
        />
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2">
        <Label>Regex Flags</Label>
        <div className="flex flex-wrap gap-2">
          {availableFlags.map((flag) => (
            <div key={flag.id} className="flex items-center space-x-2">
              <Checkbox
                id={`flag-${flag.id}`}
                checked={flags.includes(flag.id)}
                onCheckedChange={() => toggleFlag(flag.id)}
              />
              <Label htmlFor={`flag-${flag.id}`} className="cursor-pointer" title={flag.description}>
                {flag.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Search In Fields</Label>
        <div className="flex flex-wrap gap-2">
          {availableFields.map((field) => (
            <Badge
              key={field.id}
              variant={fields.includes(field.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleField(field.id)}
            >
              {field.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
