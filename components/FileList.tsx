"use client"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { deleteFile } from "@/lib/slices/filesSlice"
import { setFileUploadModalOpen } from "@/lib/slices/uiSlice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import { formatFileSize } from "@/lib/utils/stringUtils"
import { FileText, MoreVertical, Trash2, Upload, AlertCircle } from "lucide-react"

export default function FileList() {
  const dispatch = useDispatch()
  const filesObj = useSelector((state: RootState) => state.files.files)
  const processingStatus = useSelector((state: RootState) => state.files.processingStatus)
  const processingError = useSelector((state: RootState) => state.files.processingError)
  const selectedFileIds = useSelector((state: RootState) => state.files.selectedFileIds)

  // Convert files object to array
  const files = Object.values(filesObj)

  // Handle file deletion
  const handleDeleteFile = (fileId: string) => {
    dispatch(deleteFile(fileId))
  }

  // Handle opening the file upload modal
  const handleOpenUploadModal = () => {
    dispatch(setFileUploadModalOpen(true))
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-md">Files</CardTitle>
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleOpenUploadModal}>
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No log files</h3>
            <p className="text-sm text-gray-500 mb-4">Upload log files to start analyzing them</p>
            <Button onClick={handleOpenUploadModal}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Log Files
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  selectedFileIds.includes(file.id) ? "bg-teal-50 border-teal-200" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(file.uploadedAt, "UTC", "datetime")} • {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {processingStatus[file.id] === "processing" ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      Processing...
                    </Badge>
                  ) : processingError[file.id] ? (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-teal-600 border-teal-200 bg-teal-50">
                      {file.logCount?.toLocaleString() || "Processing..."} logs
                    </Badge>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
