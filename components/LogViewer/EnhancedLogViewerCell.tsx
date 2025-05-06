import { memo } from "react"
import type { LogViewerCellProps } from "./types"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"

/**
 * Enhanced Cell component for the LogViewer with text highlighting
 * Renders a single cell with formatted content and highlights matched text
 */
export const EnhancedLogViewerCell = memo(
  function EnhancedLogViewerCell({ column, log, timeZone }: LogViewerCellProps) {
    // Get the value from the log entry
    const value = typeof column.field === "string" ? log[column.field as keyof typeof log] : null

    // Get active filters from Redux store
    const filters = useSelector((state: RootState) => state.filters.filters)
    const activeTextFilters = filters.filter((f) => f.enabled && (f.type === "text" || f.type === "regex"))

    // Format the value using the column formatter if available
    const formattedValue = column.formatter ? column.formatter(value, log, timeZone) : value || "-"

    // Special handling for log level column
    if (column.id === "level" && value) {
      let levelClassName = "px-2 py-0.5 rounded text-xs font-medium"

      switch (String(value).toUpperCase()) {
        case "ERROR":
        case "FATAL":
        case "CRITICAL":
          levelClassName += " bg-red-100 text-red-800"
          break
        case "WARNING":
        case "WARN":
          levelClassName += " bg-amber-100 text-amber-800"
          break
        case "INFO":
          levelClassName += " bg-teal-100 text-teal-800"
          break
        case "DEBUG":
          levelClassName += " bg-blue-100 text-blue-800"
          break
        default:
          levelClassName += " bg-gray-100 text-gray-800"
      }

      return (
        <div
          className={`px-2 py-1 truncate ${column.className || ""}`}
          style={{ width: column.width }}
          title={typeof value === "string" ? value : undefined}
          role="cell"
        >
          <span className={levelClassName}>{formattedValue}</span>
        </div>
      )
    }

    // If there are no text filters or the value is not a string, render normally
    if (activeTextFilters.length === 0 || typeof formattedValue !== "string") {
      return (
        <div
          className={`px-2 py-1 truncate ${column.className || ""}`}
          style={{ width: column.width }}
          title={typeof value === "string" ? value : undefined}
          role="cell"
        >
          {formattedValue}
        </div>
      )
    }

    // Highlight matched text
    const highlightedText = formattedValue
    let segments: { text: string; highlight: boolean }[] = [{ text: highlightedText, highlight: false }]

    // Apply each filter
    activeTextFilters.forEach((filter) => {
      const newSegments: { text: string; highlight: boolean }[] = []

      segments.forEach((segment) => {
        // Skip already highlighted segments
        if (segment.highlight) {
          newSegments.push(segment)
          return
        }

        if (filter.type === "text") {
          const { text, caseSensitive } = filter
          if (!text) {
            newSegments.push(segment)
            return
          }

          const segmentText = segment.text
          const searchText = caseSensitive ? text : text.toLowerCase()
          const compareText = caseSensitive ? segmentText : segmentText.toLowerCase()

          let lastIndex = 0
          let index = compareText.indexOf(searchText)

          if (index === -1) {
            newSegments.push(segment)
            return
          }

          while (index !== -1) {
            // Add non-matching segment before match
            if (index > lastIndex) {
              newSegments.push({
                text: segmentText.substring(lastIndex, index),
                highlight: false,
              })
            }

            // Add matching segment
            newSegments.push({
              text: segmentText.substring(index, index + searchText.length),
              highlight: true,
            })

            lastIndex = index + searchText.length
            index = compareText.indexOf(searchText, lastIndex)
          }

          // Add remaining text
          if (lastIndex < segmentText.length) {
            newSegments.push({
              text: segmentText.substring(lastIndex),
              highlight: false,
            })
          }
        } else if (filter.type === "regex") {
          try {
            const { pattern, flags } = filter
            if (!pattern) {
              newSegments.push(segment)
              return
            }

            const regex = new RegExp(pattern, flags)
            const segmentText = segment.text
            const matches = segmentText.match(new RegExp(pattern, flags + "g"))

            if (!matches) {
              newSegments.push(segment)
              return
            }

            let lastIndex = 0
            let match: RegExpExecArray | null
            const execRegex = new RegExp(pattern, flags + "g")

            while ((match = execRegex.exec(segmentText)) !== null) {
              const index = match.index
              const matchText = match[0]

              // Add non-matching segment before match
              if (index > lastIndex) {
                newSegments.push({
                  text: segmentText.substring(lastIndex, index),
                  highlight: false,
                })
              }

              // Add matching segment
              newSegments.push({
                text: matchText,
                highlight: true,
              })

              lastIndex = index + matchText.length

              // Prevent infinite loops for zero-length matches
              if (match.index === execRegex.lastIndex) {
                execRegex.lastIndex++
              }
            }

            // Add remaining text
            if (lastIndex < segmentText.length) {
              newSegments.push({
                text: segmentText.substring(lastIndex),
                highlight: false,
              })
            }
          } catch (e) {
            // If regex is invalid, just use the original segment
            newSegments.push(segment)
          }
        }
      })

      segments = newSegments
    })

    return (
      <div
        className={`px-2 py-1 truncate ${column.className || ""}`}
        style={{ width: column.width }}
        title={typeof value === "string" ? value : undefined}
        role="cell"
      >
        {segments.map((segment, i) => (
          <span key={i} className={segment.highlight ? "bg-yellow-200 text-black" : ""}>
            {segment.text}
          </span>
        ))}
      </div>
    )
  },
  // Custom comparison function for memo to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.log.id === nextProps.log.id &&
      prevProps.column.id === nextProps.column.id &&
      prevProps.timeZone === nextProps.timeZone &&
      prevProps.column.width === nextProps.column.width
    )
  },
)
