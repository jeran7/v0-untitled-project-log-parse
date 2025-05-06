"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Upload, X, AlertTriangle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { uploadFiles } from "@/lib/thunks/fileThunks"
import { setUploadModalOpen, setCleanupModalOpen } from "@/lib/slices/uiSlice"
import { runComprehensiveAnalysis } from "@/lib/thunks/analysisThunks"
import type { AppDispatch, RootState } from "@/lib/store"

export default function FileUploader() {
  const dispatch = useDispatch<AppDispatch>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const isModalOpen = useSelector((state: RootState) => state.ui.isUploadModalOpen)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
      setError(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files))
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file to upload")
      return
    }

    setIsUploading(true)
    setProgress(0)

    try {
      await dispatch(
        uploadFiles({
          files,
          onProgress: (percent) => {
            setProgress(percent)
          },
        }),
      )

      // Close upload modal and open cleanup modal
      dispatch(setUploadModalOpen(false))
      dispatch(setCleanupModalOpen(true))

      // Reset state
      setFiles([])
      setProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Run analysis after upload
      setTimeout(() => {
        dispatch(runComprehensiveAnalysis())
      }, 1000)
    } catch (err) {
      setError(`Upload failed: ${(err as Error).message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
  }

  const handleOpenModal = () => {
    dispatch(setUploadModalOpen(true))
  }

  const handleCloseModal = () => {
    dispatch(setUploadModalOpen(false))
    setFiles([])
    setError(null)
    setProgress(0)
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <Button onClick={handleOpenModal} className="gap-2">
        <Upload className="h-4 w-4" />
        Upload Logs
      </Button>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Log Files</DialogTitle>
          </DialogHeader>

          <div
            className={`mt-4 border-2 border-dashed rounded-lg p-6 text-center ${
              error ? "border-red-400" : "border-gray-300"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept=".log,.txt,.json,.xml,.csv"
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                Drag and drop log files here, or{" "}
                <button
                  type="button"
                  className="text-blue-500 hover:text-blue-700 font-medium"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-400">Supports .log, .txt, .json, .xml, .csv files</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Selected Files ({files.length})</p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-gray-500 hover:text-gray-700"
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={handleCloseModal} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
