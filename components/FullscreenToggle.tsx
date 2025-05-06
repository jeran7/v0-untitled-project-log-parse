"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Maximize, Minimize } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FullscreenToggleProps {
  targetRef: React.RefObject<HTMLElement>
  className?: string
}

export default function FullscreenToggle({ targetRef, className = "" }: FullscreenToggleProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { toast } = useToast()

  // Update fullscreen state when it changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 key or Escape key
      if (e.key === "F11" || (e.key === "Escape" && isFullscreen)) {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isFullscreen])

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (targetRef.current) {
          if (targetRef.current.requestFullscreen) {
            await targetRef.current.requestFullscreen()
          } else if (targetRef.current.webkitRequestFullscreen) {
            // Safari
            await targetRef.current.webkitRequestFullscreen()
          } else if (targetRef.current.msRequestFullscreen) {
            // IE11
            await targetRef.current.msRequestFullscreen()
          }

          toast({
            title: "Entered fullscreen mode",
            description: "Press ESC or F11 to exit",
            duration: 3000,
          })
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          // Safari
          await document.webkitExitFullscreen()
        } else if (document.msExitFullscreen) {
          // IE11
          await document.msExitFullscreen()
        }

        toast({
          title: "Exited fullscreen mode",
          duration: 2000,
        })
      }
    } catch (error) {
      console.error("Fullscreen error:", error)
      toast({
        title: "Fullscreen error",
        description: "Could not toggle fullscreen mode",
        variant: "destructive",
      })
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleFullscreen}
      className={className}
      title={isFullscreen ? "Exit fullscreen (F11)" : "Enter fullscreen (F11)"}
    >
      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </Button>
  )
}
