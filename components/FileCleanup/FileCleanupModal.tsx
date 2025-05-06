"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { setCleanupModalOpen } from "@/lib/slices/uiSlice"
import { processFile } from "@/lib/thunks/fileThunks"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText } from "lucide-react"
import type { RootState } from "@/lib/store"
import type { AppDispatch } from "@/lib/store"

interface FileCleanupModalProps {
  files: File[]
}

export default function FileCleanupModal({ files }: FileCleanupModalProps) {
  const dispatch = useDispatch<AppDispatch>()
  const isOpen = useSelector((state: RootState) => state.ui.fileCleanupModalOpen)
  const [textPattern, setTextPattern] = useState("")
  const [regexPattern, setRegexPattern] = useState("")
  const [isRegexValid, setIsRegexValid] = useState(true)
  const [useRegex, setUseRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [previewLines, setPreviewLines] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedFiles, setProcessedFiles] = useState<string[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)

  // Reset state when files change
  useEffect(() => {
    if (files.length > 0) {
      setTextPattern("")
      setRegexPattern("")
      setUseRegex(false)
      setCaseSensitive(false)
      setPreviewLines([])
      setIsLoading(false)
      setProgress(0)
      setProcessedFiles([])
      setCurrentFile(null)
    }
  }, [files])

  // Validate regex when it changes
  useEffect(() => {
    if (useRegex && regexPattern) {
      try {
        new RegExp(regexPattern, caseSensitive ? "" : "i")
        setIsRegexValid(true)
      } catch (e) {
        setIsRegexValid(false)
      }
    } else {
      setIsRegexValid(true)
    }
  }, [regexPattern, useRegex, caseSensitive])

  // Generate preview when pattern changes
  useEffect(() => {
    if (!isOpen || files.length === 0) return

    const generatePreview = async () => {
      if ((!textPattern && !useRegex) || (useRegex && !regexPattern)) {
        setPreviewLines([])
        return
      }

      setIsLoading(true)
      const previewFile = files[0]
      const maxPreviewLines = 100
      const previewText = await readFileChunk(previewFile, 0, 100 * 1024) // Read first 100KB for preview

      let pattern: RegExp
      if (useRegex) {
        try {
          pattern = new RegExp(regexPattern, caseSensitive ? "" : "i")
        } catch (e) {
          setIsLoading(false)
          return
        }
      } else {
        const escapedPattern = textPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        pattern = new RegExp(escapedPattern, caseSensitive ? "" : "i")
      }

      const lines = previewText.split(/\r?\n/)
      const matchedLines = lines.filter((line) => pattern.test(line)).slice(0, maxPreviewLines)

      setPreviewLines(matchedLines)
      setIsLoading(false)
    }

    const debounce = setTimeout(generatePreview, 300)
    return () => clearTimeout(debounce)
  }, [isOpen, files, textPattern, regexPattern, useRegex, caseSensitive])

  const readFileChunk = (file: File, start: number, length: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file.slice(start, start + length))
    })
  }

  const handleClose = () => {
    dispatch(setCleanupModalOpen(false))
  }

  const handleCleanAndProcess = async () => {
    if (files.length === 0) return

    setIsLoading(true)
    setProgress(0)
    setProcessedFiles([])

    let pattern: RegExp | null = null
    if (useRegex && regexPattern) {
      try {
        pattern = new RegExp(regexPattern, caseSensitive ? "" : "i")
      } catch (e) {
        setIsLoading(false)
        return
      }
    } else if (textPattern) {
      const escapedPattern = textPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      pattern = new RegExp(escapedPattern, caseSensitive ? "" : "i")
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setCurrentFile(file.name)

      if (pattern) {
        // Clean the file by removing lines that match the pattern
        const cleanedFile = await cleanFile(file, pattern)
        // Process the cleaned file
        await dispatch(processFile(cleanedFile))
      } else {
        // Process the original file if no pattern is specified
        await dispatch(processFile(file))
      }

      setProcessedFiles((prev) => [...prev, file.name])
      setProgress(((i + 1) / files.length) * 100)
    }

    setIsLoading(false)
    setCurrentFile(null)
    handleClose()
  }

  const cleanFile = async (file: File, pattern: RegExp): Promise<File> => {
    const text = await readFileChunk(file, 0, file.size)
    const lines = text.split(/\r?\n/)
    const cleanedLines = lines.filter((line) => !pattern.test(line))
    const cleanedText = cleanedLines.join("\n")

    return new File([cleanedText], file.name, { type: file.type })
  }

  const handleSkip = async () => {
    if (files.length === 0) return

    setIsLoading(true)
    setProgress(0)
    setProcessedFiles([])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setCurrentFile(file.name)
      await dispatch(processFile(file))
      setProcessedFiles((prev) => [...prev, file.name])
      setProgress(((i + 1) / files.length) * 100)
    }

    setIsLoading(false)
    setCurrentFile(null)
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Clean Up Log Files</DialogTitle>
        </DialogHeader>

        {files.length === 0 ? (
          <div className="text-center py-4">
            <p>No files selected for cleanup.</p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Text Pattern</TabsTrigger>
                <TabsTrigger value="regex">Regular Expression</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="text-pattern">Enter text to remove lines containing:</Label>
                  <Input
                    id="text-pattern"
                    placeholder="e.g., DEBUG, error, warning"
                    value={textPattern}
                    onChange={(e) => setTextPattern(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="case-sensitive-text"
                    checked={caseSensitive}
                    onCheckedChange={(checked) => setCaseSensitive(checked === true)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="case-sensitive-text">Case sensitive</Label>
                </div>
              </TabsContent>
              <TabsContent value="regex" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="regex-pattern">Enter regular expression to remove matching lines:</Label>
                  <Input
                    id="regex-pattern"
                    placeholder="e.g., ^\d{4}-\d{2}-\d{2}.*DEBUG"
                    value={regexPattern}
                    onChange={(e) => {
                      setRegexPattern(e.target.value)
                      setUseRegex(true)
                    }}
                    className={!isRegexValid ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {!isRegexValid && <p className="text-red-500 text-sm">Invalid regular expression</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="case-sensitive-regex"
                    checked={caseSensitive}
                    onCheckedChange={(checked) => setCaseSensitive(checked === true)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="case-sensitive-regex">Case sensitive</Label>
                </div>
              </TabsContent>
            </Tabs>

            {isLoading && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <span className="text-sm">Processing files...</span>
                  <span className="text-sm">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentFile && <p className="text-sm text-muted-foreground">Current file: {currentFile}</p>}
                {processedFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Processed files:</p>
                    <ScrollArea className="h-20 mt-1">
                      <div className="space-y-1">
                        {processedFiles.map((file, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <FileText className="h-3 w-3 mr-2" />
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {!isLoading && (previewLines.length > 0 || (useRegex && regexPattern) || textPattern) && (
              <div className="mt-4">
                <Label>Preview of lines that will be removed:</Label>
                <ScrollArea className="h-40 mt-2 border rounded-md p-2">
                  {previewLines.length > 0 ? (
                    <div className="space-y-1">
                      {previewLines.map((line, index) => (
                        <div key={index} className="text-sm font-mono break-all">
                          {line}
                        </div>
                      ))}
                      {previewLines.length === 100 && (
                        <div className="text-sm text-muted-foreground italic">Showing first 100 matches only</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No matching lines found in the preview</div>
                  )}
                </ScrollArea>
              </div>
            )}

            <div className="mt-4">
              <Label>Selected Files:</Label>
              <ScrollArea className="h-20 mt-2 border rounded-md p-2">
                <div className="space-y-1">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <FileText className="h-3 w-3 mr-2" />
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleSkip} disabled={isLoading}>
                Skip Cleanup
              </Button>
              <Button
                onClick={handleCleanAndProcess}
                disabled={isLoading || (useRegex && (!regexPattern || !isRegexValid)) || (!useRegex && !textPattern)}
              >
                Clean & Process
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
