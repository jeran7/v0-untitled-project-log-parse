"use client"

import { useState, useEffect } from "react"
import type { TextFilter as TextFilterType } from "@/types/filters"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

interface TextFilterProps {
  filter: TextFilterType
  onChange: (filter: TextFilterType) => void
}

/**
 * Text Filter Component
 *
 * Allows filtering logs by plain text with case sensitivity option
 */
export function TextFilter({ filter, onChange }: TextFilterProps) {
  const [text, setText] = useState(filter.text || "")
  const [caseSensitive, setCaseSensitive] = useState(filter.caseSensitive || false)
  const [fields, setFields] = useState<string[]>(filter.fields || ["message", "raw"])

  // Update the filter when text or options change
  useEffect(() => {
    onChange({
      ...filter,
      text,
      caseSensitive,
      fields,
    })
  }, [text, caseSensitive, fields, filter, onChange])

  // Toggle search fields
  const toggleField = (field: string) => {
    if (fields.includes(field)) {
      setFields(fields.filter((f) => f !== field))
    } else {
      setFields([...fields, field])
    }
  }

  // Common searchable fields
  const availableFields = [
    { id: "message", name: "Message" },
    { id: "raw", name: "Raw Log" },
    { id: "level", name: "Level" },
    { id: "source", name: "Source" },
  ]

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="search-text">Search Text</Label>
        <Input
          id="search-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to search for..."
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="case-sensitive">Case Sensitive</Label>
        <Switch id="case-sensitive" checked={caseSensitive} onCheckedChange={setCaseSensitive} />
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
