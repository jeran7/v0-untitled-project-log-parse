"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { subDays, subHours, startOfDay, endOfDay } from "date-fns"
import type { RootState } from "@/lib/store"
import type { TimestampFilter as TimestampFilterType } from "@/types/filters"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import { CalendarIcon } from "lucide-react"

interface TimestampFilterProps {
  filter: TimestampFilterType
  onChange: (filter: TimestampFilterType) => void
}

/**
 * Timestamp Filter Component
 *
 * Allows filtering logs by time range with date/time pickers
 * and quick selection options
 */
export function TimestampFilter({ filter, onChange }: TimestampFilterProps) {
  const [range, setRange] = useState(filter.range)
  const timeZone = useSelector((state: RootState) => state.ui.timeZone)

  // Update the filter when range changes
  useEffect(() => {
    onChange({
      ...filter,
      range,
    })
  }, [range, filter, onChange])

  // Quick selection options
  const quickSelectOptions = [
    { label: "Last 15 minutes", fn: () => ({ start: subHours(new Date(), 0.25), end: new Date() }) },
    { label: "Last hour", fn: () => ({ start: subHours(new Date(), 1), end: new Date() }) },
    { label: "Last 24 hours", fn: () => ({ start: subHours(new Date(), 24), end: new Date() }) },
    { label: "Today", fn: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
    {
      label: "Yesterday",
      fn: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }),
    },
    { label: "Last 7 days", fn: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Start date/time */}
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date/Time</Label>
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
                  selected={range.start}
                  onSelect={(date) => date && setRange({ ...range, start: new Date(date) })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              id="start-date"
              value={formatTimestamp(range.start.toISOString(), timeZone, "datetime")}
              readOnly
              className="rounded-l-none"
            />
          </div>
        </div>

        {/* End date/time */}
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date/Time</Label>
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
                  selected={range.end}
                  onSelect={(date) => date && setRange({ ...range, end: new Date(date) })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              id="end-date"
              value={formatTimestamp(range.end.toISOString(), timeZone, "datetime")}
              readOnly
              className="rounded-l-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Quick Select</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {quickSelectOptions.map((option) => (
            <Button
              key={option.label}
              variant="outline"
              size="sm"
              onClick={() => setRange(option.fn())}
              className="h-8"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
