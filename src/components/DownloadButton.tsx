'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { fileHandlingService } from '~/lib/file-handling.service';
import type { DownloadButtonProps } from '~/types/app';
import { AppError, ErrorCategory } from '~/types/app';

/**
 * DownloadButton component that triggers SVG file download
 * Uses shadcn/ui Button component with client-side blob creation
 */
export function DownloadButton({ 
  svgContent, 
  fileName, 
  disabled = false 
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  /**
   * Handles the download button click
   * Creates blob and triggers download using FileHandlingService
   */
  const handleDownload = React.useCallback(() => {
    if (!svgContent || !fileName || disabled || isDownloading) {
      return;
    }

    setIsDownloading(true);

    // Use setTimeout to ensure the downloading state is visible
    setTimeout(() => {
      try {
        // Generate proper SVG filename from original image name
        const svgFileName = fileHandlingService.generateSvgFileName(fileName);
        
        // Create blob with SVG content
        const blob = fileHandlingService.createDownloadBlob(svgContent, 'image/svg+xml');
        
        // Trigger download
        fileHandlingService.triggerDownload(blob, svgFileName);
      } catch (error) {
        // Handle download errors gracefully
        console.error('Download failed:', error);
        
        // If it's an AppError, we could potentially show user-friendly message
        if (error instanceof AppError) {
          // In a real app, this would trigger a toast or error display
          console.error('User-friendly error:', error.userMessage);
        }
      } finally {
        setIsDownloading(false);
      }
    }, 0);
  }, [svgContent, fileName, disabled, isDownloading]);

  // Determine if button should be disabled
  const isButtonDisabled = disabled || isDownloading || !svgContent || !fileName;

  // Generate SVG filename for aria-label (only if fileName exists)
  const svgFileName = fileName ? fileHandlingService.generateSvgFileName(fileName) : 'file.svg';

  return (
    <Button
      onClick={handleDownload}
      disabled={isButtonDisabled}
      variant="default"
      size="default"
      className="min-w-[120px]"
      aria-label={`Download SVG file: ${svgFileName}`}
    >
      <Download className="mr-2 h-4 w-4" />
      {isDownloading ? 'Downloading...' : 'Download SVG'}
    </Button>
  );
}