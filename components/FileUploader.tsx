"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useDispatch } from "react-redux"
import { processFile } from "@/lib/thunks/fileThunks"
import { setFileUploadModalOpen } from "@/lib/slices/uiSlice"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Upload, X, FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FileUploader() {
  const dispatch = useDispatch()
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    validateAndAddFiles(droppedFiles)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      validateAndAddFiles(selectedFiles)
    }
  }

  const validateAndAddFiles = (newFiles: File[]) => {
    setError(null)

    // Validate file types
    const validFiles = newFiles.filter((file) => {
      const isValid = file.name.endsWith(".csv") || file.name.endsWith(".log") || file.name.endsWith(".txt")

      if (!isValid) {
        setError("Only CSV, LOG, and TXT files are supported.")
      }

      return isValid
    })

    // Validate file sizes
    const validSizedFiles = validFiles.filter((file) => {
      const isValidSize = file.size <= 300 * 1024 * 1024 // 300MB

      if (!isValidSize) {
        setError("Files must be smaller than 300MB.")
      }

      return isValidSize
    })

    setFiles((prev) => [...prev, ...validSizedFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    // Process each file
    files.forEach((file) => {
      console.log("Processing file:", file.name)
      // @ts-ignore - processFile is a thunk
      dispatch(processFile(file))
    })

    // Close the modal
    dispatch(setFileUploadModalOpen(false))
  }

  const handleClose = () => {
    dispatch(setFileUploadModalOpen(false))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB"
    else return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Log Files</DialogTitle>
        </DialogHeader>

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/20"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <div className="mt-4">
            <p className="text-sm font-medium">Drag and drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supports CSV, LOG, and TXT files up to 300MB</p>
          </div>
          <Button variant="secondary" className="mt-4" onClick={() => fileInputRef.current?.click()}>
            Browse Files
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept=".csv,.log,.txt"
            onChange={handleFileInputChange}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Selected Files:</p>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0}>
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
