"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { setFileCleanupModalOpen } from "@/lib/slices/uiSlice"
import { processFile } from "@/lib/thunks/fileThunks"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, AlertTriangle } from "lucide-react"
import { formatFileSize } from "@/lib/utils/stringUtils"

export default function FileCleanupModal() {
  const dispatch = useDispatch()
  const isOpen = useSelector((state: RootState) => state.ui.fileCleanupModalOpen)
  const pendingFiles = useSelector((state: RootState) => state.files.pendingFiles)
  const currentFile = pendingFiles[0] || null

  const [cleanupMethod, setCleanupMethod] = useState("text")
  const [textPattern, setTextPattern] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regexPattern, setRegexPattern] = useState("")
  const [regexFlags, setRegexFlags] = useState("g")
  const [fileContent, setFileContent] = useState<string[]>([])
  const [previewContent, setPreviewContent] = useState<string[]>([])
  const [removedLineCount, setRemovedLineCount] = useState(0)
  const [regexError, setRegexError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Load file content for preview
  useEffect(() => {
    if (currentFile && currentFile.content) {
      const lines = currentFile.content.split("\n").slice(0, 100) // Preview first 100 lines
      setFileContent(lines)
      setPreviewContent(lines)
    } else {
      setFileContent([])
      setPreviewContent([])
    }
  }, [currentFile])

  // Apply cleanup pattern to preview
  useEffect(() => {
    if (fileContent.length === 0) return

    try {
      let filteredLines: string[]
      let removedCount = 0

      if (cleanupMethod === "text") {
        const pattern = textPattern.trim()
        if (!pattern) {
          setPreviewContent(fileContent)
          setRemovedLineCount(0)
          return
        }

        filteredLines = fileContent.filter((line) => {
          const matches = caseSensitive ? line.includes(pattern) : line.toLowerCase().includes(pattern.toLowerCase())

          if (matches) removedCount++
          return !matches
        })
      } else {
        // Regex method
        if (!regexPattern.trim()) {
          setPreviewContent(fileContent)
          setRemovedLineCount(0)
          return
        }

        try {
          const regex = new RegExp(regexPattern, regexFlags)
          setRegexError("")

          filteredLines = fileContent.filter((line) => {
            const matches = regex.test(line)
            if (matches) removedCount++
            return !matches
          })
        } catch (error) {
          setRegexError((error as Error).message)
          filteredLines = fileContent
          removedCount = 0
        }
      }

      setPreviewContent(filteredLines)
      setRemovedLineCount(removedCount)
    } catch (error) {
      console.error("Error applying cleanup pattern:", error)
      setPreviewContent(fileContent)
      setRemovedLineCount(0)
    }
  }, [fileContent, cleanupMethod, textPattern, caseSensitive, regexPattern, regexFlags])

  // Handle closing the modal
  const handleClose = () => {
    if (isProcessing) return
    dispatch(setFileCleanupModalOpen(false))
  }

  // Handle skipping cleanup
  const handleSkipCleanup = () => {
    if (isProcessing || !currentFile) return

    setIsProcessing(true)
    setProgress(0)

    // Process file without cleanup
    dispatch(
      processFile({
        file: currentFile,
        onProgress: (progress) => setProgress(progress),
      }),
    )
      .then(() => {
        setIsProcessing(false)
        dispatch(setFileCleanupModalOpen(false))
      })
      .catch(() => {
        setIsProcessing(false)
      })
  }

  // Handle applying cleanup
  const handleApplyCleanup = () => {
    if (isProcessing || !currentFile) return

    setIsProcessing(true)
    setProgress(0)

    try {
      let cleanedContent: string

      if (cleanupMethod === "text") {
        const pattern = textPattern.trim()
        if (!pattern) {
          cleanedContent = currentFile.content
        } else {
          const lines = currentFile.content.split("\n")
          const filteredLines = lines.filter((line) => {
            return caseSensitive ? !line.includes(pattern) : !line.toLowerCase().includes(pattern.toLowerCase())
          })
          cleanedContent = filteredLines.join("\n")
        }
      } else {
        // Regex method
        if (!regexPattern.trim() || regexError) {
          cleanedContent = currentFile.content
        } else {
          const regex = new RegExp(regexPattern, regexFlags)
          const lines = currentFile.content.split("\n")
          const filteredLines = lines.filter((line) => !regex.test(line))
          cleanedContent = filteredLines.join("\n")
        }
      }

      // Process file with cleaned content
      const cleanedFile = {
        ...currentFile,
        content: cleanedContent,
      }

      dispatch(
        processFile({
          file: cleanedFile,
          onProgress: (progress) => setProgress(progress),
        }),
      )
        .then(() => {
          setIsProcessing(false)
          dispatch(setFileCleanupModalOpen(false))
        })
        .catch(() => {
          setIsProcessing(false)
        })
    } catch (error) {
      console.error("Error applying cleanup:", error)
      setIsProcessing(false)
    }
  }

  // Toggle regex flags
  const toggleRegexFlag = (flag: string) => {
    setRegexFlags((prev) => (prev.includes(flag) ? prev.replace(flag, "") : prev + flag))
  }

  if (!currentFile) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Clean Up Log File</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{currentFile.name}</span>
          <span className="text-muted-foreground">({formatFileSize(currentFile.size)})</span>
        </div>

        {isProcessing ? (
          <div className="py-8 space-y-4">
            <div className="text-center">Processing file...</div>
            <Progress value={progress} className="h-2" />
            <div className="text-center text-sm text-muted-foreground">{progress}% complete</div>
          </div>
        ) : (
          <>
            <Tabs defaultValue="text" value={cleanupMethod} onValueChange={setCleanupMethod}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="text">Text Pattern</TabsTrigger>
                <TabsTrigger value="regex">Regex Pattern</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="textPattern">Remove lines containing text:</Label>
                  <Input
                    id="textPattern"
                    placeholder="Enter text to match"
                    value={textPattern}
                    onChange={(e) => setTextPattern(e.target.value)}
                  />

                  <div className="flex items-center space-x-2">
                    <Switch id="caseSensitive" checked={caseSensitive} onCheckedChange={setCaseSensitive} />
                    <Label htmlFor="caseSensitive">Case sensitive</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="regex" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="regexPattern">Remove lines matching regex:</Label>
                  <Input
                    id="regexPattern"
                    placeholder="Enter regular expression"
                    value={regexPattern}
                    onChange={(e) => setRegexPattern(e.target.value)}
                    className={regexError ? "border-red-500" : ""}
                  />

                  {regexError && (
                    <div className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {regexError}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="flagI"
                        checked={regexFlags.includes("i")}
                        onCheckedChange={() => toggleRegexFlag("i")}
                      />
                      <Label htmlFor="flagI">Case insensitive (i)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="flagM"
                        checked={regexFlags.includes("m")}
                        onCheckedChange={() => toggleRegexFlag("m")}
                      />
                      <Label htmlFor="flagM">Multiline (m)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="flagG"
                        checked={regexFlags.includes("g")}
                        onCheckedChange={() => toggleRegexFlag("g")}
                      />
                      <Label htmlFor="flagG">Global (g)</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="border rounded-md">
              <div className="p-2 border-b bg-muted/50 flex justify-between items-center">
                <span className="text-sm font-medium">Preview (first 100 lines)</span>
                <span className="text-sm text-muted-foreground">
                  {removedLineCount > 0 ? `${removedLineCount} lines will be removed` : "No lines will be removed"}
                </span>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="p-2 font-mono text-xs whitespace-pre">
                  {previewContent.length > 0 ? (
                    previewContent.map((line, index) => (
                      <div key={index} className="py-0.5">
                        {line || " "}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">No content to preview</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleSkipCleanup} disabled={isProcessing}>
            Skip Cleanup
          </Button>
          <Button onClick={handleApplyCleanup} disabled={isProcessing}>
            Apply Cleanup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
