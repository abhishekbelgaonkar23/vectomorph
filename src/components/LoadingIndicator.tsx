"use client"

import * as React from "react"
import { Progress } from "~/components/ui/progress"
import { Card, CardContent } from "~/components/ui/card"
import { cn } from "~/lib/utils"
import type { LoadingIndicatorProps } from "~/types/app"

/**
 * LoadingIndicator component displays an animated loading state during image processing
 * Uses shadcn/ui Progress component with proper accessibility attributes
 */
export function LoadingIndicator({ 
  isVisible, 
  message = "Processing image..." 
}: LoadingIndicatorProps) {
  const [progress, setProgress] = React.useState(0)

  // Animate progress bar with a smooth indeterminate animation
  React.useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        // Create a smooth back-and-forth animation
        const newProgress = (prev + 2) % 200
        return newProgress > 100 ? 200 - newProgress : newProgress
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) {
    return null
  }

  return (
    <Card 
      className={cn(
        "w-full max-w-md mx-auto",
        "animate-in fade-in-0 duration-200",
        isVisible ? "block" : "hidden"
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading indicator"
    >
      <CardContent className="p-6 space-y-4">
        {/* Loading spinner animation */}
        <div className="flex items-center justify-center">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
            aria-hidden="true"
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className="w-full"
            aria-label="Processing progress"
          />
          
          {/* Status message */}
          {message && (
            <p 
              className="text-sm text-muted-foreground text-center"
              aria-live="polite"
              id="loading-message"
            >
              {message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}