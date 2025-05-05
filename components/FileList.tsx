"use client"

import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { selectFile, deselectFile } from "@/lib/slices/filesSlice"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function FileList() {
  const dispatch = useDispatch()
  const files = useSelector((state: RootState) => state.files.files)
  const processingStatus = useSelector((state: RootState) => state.files.processingStatus)
  const processingProgress = useSelector((state: RootState) => state.files.processingProgress)
  const selectedFileIds = useSelector((state: RootState) => state.files.selectedFileIds)
  const timeZone = useSelector((state: RootState) => state.ui.timeZone)

  const handleToggleFile = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      dispatch(deselectFile(fileId))
    } else {
      dispatch(selectFile(fileId))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB"
    else return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Log Files</h3>

      <div className="space-y-2">
        {Object.values(files).map((file) => (
          <div
            key={file.id}
            className={`p-3 rounded-md border ${
              selectedFileIds.includes(file.id) ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selectedFileIds.includes(file.id)}
                onCheckedChange={() => handleToggleFile(file.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <p className="font-medium truncate">{file.name}</p>
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  <p>
                    {formatFileSize(file.size)} • {file.logCount || 0} logs
                  </p>

                  {file.startTime && file.endTime && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatTimestamp(file.startTime, timeZone, "datetime")} -
                        {formatTimestamp(file.endTime, timeZone, "time")}
                      </span>
                    </div>
                  )}
                </div>

                {processingStatus[file.id] === "processing" && (
                  <div className="mt-2">
                    <Progress value={processingProgress[file.id]} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">Processing: {processingProgress[file.id]}%</p>
                  </div>
                )}

                {processingStatus[file.id] === "error" && (
                  <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Error processing file</span>
                  </div>
                )}

                {processingStatus[file.id] === "completed" && (
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Processing complete</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {Object.keys(files).length === 0 && (
          <div className="text-center p-4 text-muted-foreground">
            <p>No files uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
