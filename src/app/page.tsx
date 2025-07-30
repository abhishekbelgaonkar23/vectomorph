'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { FileDropzone } from '~/components/FileDropzone';
import { LoadingIndicator } from '~/components/LoadingIndicator';
import { SVGPreview } from '~/components/SVGPreview';
import { SVGGrid } from '~/components/SVGGrid';
import { DownloadButton } from '~/components/DownloadButton';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { AlertCircle, RefreshCw, FileImage, Zap, Shield, Globe, Github, Twitter, DownloadCloud } from 'lucide-react';
import { imageProcessingService } from '~/lib/image-processing.service';
import { fileHandlingService } from '~/lib/file-handling.service';
import type { AppState, ConversionSession, AppConfig, ConversionResult } from '~/types/app';
import { ProcessingState, AppError } from '~/types/app';
import { cn } from '~/lib/utils';

/**
 * Main application component with centralized state management
 * Handles the complete conversion workflow from upload to download
 */
export default function HomePage() {
  // Application configuration
  const appConfig: AppConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['.png', '.jpg', '.jpeg', '.bmp', '.gif'],
    defaultTracingOptions: imageProcessingService.getDefaultOptions(),
    ui: {
      theme: 'light',
      animations: true
    }
  };

  // Main application state
  const [appState, setAppState] = useState<AppState>({
    uploadedFiles: [],
    isProcessing: false,
    conversionResults: [],
    error: null,
    processingState: ProcessingState.IDLE,
    currentlyProcessing: undefined
  });

  // Current conversion session
  const [currentSession, setCurrentSession] = useState<ConversionSession | null>(null);

  // Processing message for loading indicator
  const [processingMessage, setProcessingMessage] = useState<string>('Processing image...');

  // Error boundary ref for recovery
  const errorBoundaryRef = useRef<{ reset: () => void } | null>(null);

  /**
   * Handles file selection from FileDropzone
   * Initiates the conversion process for multiple files
   */
  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Reset state for new batch
    setAppState(prev => ({
      ...prev,
      uploadedFiles: files,
      isProcessing: true,
      conversionResults: [],
      error: null,
      processingState: ProcessingState.PROCESSING,
      currentlyProcessing: files[0]?.name
    }));

    const results: ConversionResult[] = [];

    try {
      // Process each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const startTime = Date.now();

        setAppState(prev => ({
          ...prev,
          currentlyProcessing: file.name
        }));

        setProcessingMessage(`Converting ${file.name} (${i + 1}/${files.length})...`);

        try {
          // Process the image using ImageProcessingService
          const svgContent = await imageProcessingService.processImage(file);
          const processingTime = Date.now() - startTime;

          const result: ConversionResult = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            file,
            svgContent,
            processingTime
          };

          results.push(result);

          // Update state with new result
          setAppState(prev => ({
            ...prev,
            conversionResults: [...prev.conversionResults, result]
          }));

        } catch (error) {
          // Handle individual file processing errors
          const errorMessage = error instanceof AppError
            ? error.userMessage
            : 'An unexpected error occurred during image processing';

          const result: ConversionResult = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            file,
            svgContent: '', // Empty SVG for failed conversions
            error: errorMessage
          };

          results.push(result);

          // Update state with error result
          setAppState(prev => ({
            ...prev,
            conversionResults: [...prev.conversionResults, result]
          }));

          console.error(`Failed to process ${file.name}:`, error);
        }
      }

      // All files processed
      setAppState(prev => ({
        ...prev,
        isProcessing: false,
        processingState: ProcessingState.COMPLETED,
        currentlyProcessing: undefined
      }));

      setProcessingMessage('All conversions completed!');

    } catch (error) {
      // Handle batch processing errors
      const errorMessage = error instanceof AppError
        ? error.userMessage
        : 'An unexpected error occurred during batch processing';

      setAppState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        processingState: ProcessingState.ERROR,
        currentlyProcessing: undefined
      }));

      console.error('Batch processing failed:', error);
    }
  }, []);

  /**
   * Handles error recovery - resets the application to initial state
   */
  const handleErrorRecovery = useCallback(() => {
    setAppState({
      uploadedFiles: [],
      isProcessing: false,
      conversionResults: [],
      error: null,
      processingState: ProcessingState.IDLE,
      currentlyProcessing: undefined
    });
    setCurrentSession(null);
    setProcessingMessage('Processing images...');

    // Reset error boundary if available
    errorBoundaryRef.current?.reset();
  }, []);

  /**
   * Handles retry with the same files
   */
  const handleRetry = useCallback(() => {
    if (appState.uploadedFiles.length > 0) {
      handleFileSelect(appState.uploadedFiles);
    }
  }, [appState.uploadedFiles, handleFileSelect]);

  /**
   * Handles starting a new conversion
   */
  const handleNewConversion = useCallback(() => {
    handleErrorRecovery();
  }, [handleErrorRecovery]);

  /**
   * Determines if the FileDropzone should be disabled
   */
  const isDropzoneDisabled = appState.isProcessing || appState.processingState === ProcessingState.PROCESSING;

  /**
   * Gets the appropriate loading message based on processing state
   */
  const getLoadingMessage = useCallback(() => {
    if (appState.currentlyProcessing) {
      return `Converting ${appState.currentlyProcessing}...`;
    }

    switch (appState.processingState) {
      case ProcessingState.UPLOADING:
        return 'Preparing images for conversion...';
      case ProcessingState.PROCESSING:
        return 'Converting images to SVG...';
      default:
        return processingMessage;
    }
  }, [appState.processingState, appState.currentlyProcessing, processingMessage]);

  /**
   * Renders the main content based on current state
   */
  const renderMainContent = () => {
    // Show loading indicator during processing
    if (appState.isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LoadingIndicator
            isVisible={true}
            message={getLoadingMessage()}
          />
          {appState.conversionResults.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              {appState.conversionResults.length} of {appState.uploadedFiles.length} completed
            </div>
          )}
        </div>
      );
    }

    // Show error state with recovery options
    if (appState.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Conversion Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {appState.error}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                {appState.uploadedFiles.length > 0 && (
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                )}
                <Button
                  onClick={handleNewConversion}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileImage className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show SVG grid when conversions are complete
    if (appState.conversionResults.length > 0) {
      return (
        <div className="w-full h-full flex flex-col px-4">
          {/* Success message and action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-4 border-b border-border/50">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {appState.conversionResults.length === 1
                ? 'Conversion completed successfully'
                : `${appState.conversionResults.length} conversions completed`
              }
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {appState.conversionResults.filter(r => !r.error).length > 1 && (
                <Button
                  variant="default"
                  size="default"
                  onClick={() => {
                    // Download all functionality
                    const validResults = appState.conversionResults.filter(r => !r.error);
                    validResults.forEach((result, index) => {
                      setTimeout(() => {
                        const blob = new Blob([result.svgContent], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${result.file.name.replace(/\.[^/.]+$/, '')}.svg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }, index * 100);
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <DownloadCloud className="h-4 w-4" />
                  Download All
                </Button>
              )}

              <Button
                onClick={handleNewConversion}
                variant="outline"
                size="default"
                className="flex items-center gap-2"
              >
                <FileImage className="h-4 w-4" />
                Convert More Images
              </Button>
            </div>
          </div>

          {/* SVG Grid for multiple results or single preview for one result */}
          <div className="flex-1 overflow-y-auto py-4">
            {appState.conversionResults.length === 1 ? (
              <div className="max-w-2xl mx-auto">
                <SVGPreview
                  svgContent={appState.conversionResults[0]!.svgContent}
                  originalFileName={appState.conversionResults[0]!.file.name}
                />
              </div>
            ) : (
              <SVGGrid
                results={appState.conversionResults.filter(r => !r.error)}
                onRemove={(id) => {
                  setAppState(prev => ({
                    ...prev,
                    conversionResults: prev.conversionResults.filter(r => r.id !== id)
                  }));
                }}
              />
            )}
          </div>
        </div>
      );
    }

    // Default state - show file dropzone
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
        <div className="w-full max-w-2xl mx-auto">
          <FileDropzone
            onFileSelect={handleFileSelect}
            acceptedTypes={appConfig.supportedFormats}
            maxFileSize={appConfig.maxFileSize}
            disabled={isDropzoneDisabled}
            multiple={true} // Enable multiple file selection
          />

          {/* Quick info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Supports PNG, JPG, BMP, GIF • Max 10MB each • Processed locally
            </p>
          </div>

          {/* Development test button */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-center mt-2">
              <Button
                onClick={async () => {
                  const available = await imageProcessingService.testImageTracerAvailability();
                  alert(`ImageTracer available: ${available}`);
                }}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
              >
                Test ImageTracer (Dev)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative">
            <Image
              src="/Untitled.svg"
              alt="VectoMorph Logo"
              width={32}
              height={32}
              className="w-full h-full"
            />
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-jersey-15)] bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            VectoMorph
          </h1>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-green-600" />
            <span className="hidden sm:inline">Privacy-focused</span>
          </div>
          <div className="hidden sm:block w-1 h-1 bg-muted-foreground/30 rounded-full" />
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-blue-600" />
            <span className="hidden sm:inline">Client-side</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center p-4 min-h-0 pb-16">
        <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
          {/* Subtitle */}
          <div className="text-center mb-6">
            <p className="text-lg text-muted-foreground">
              Convert raster images to scalable vector graphics entirely in your browser
            </p>
          </div>

          {/* Main Application Content */}
          <div className="flex-1 min-h-0 overflow-y-auto py-4">
            {renderMainContent()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Built by</span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/abhishekbelgaonkar23"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                <span className="font-medium">Abhishek Belgaonkar</span>
              </a>
              <a
                href="https://x.com/AbhishekBelgaon"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Twitter className="h-4 w-4" />
                <span className="font-medium">@AbhishekBelgaon</span>
              </a>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-xs">
              All processing happens locally. No data uploaded.
            </p>
          </div>
        </div>
      </footer>

      {/* Session info for debugging (only in development) */}
      {process.env.NODE_ENV === 'development' && currentSession && (
        <div className="fixed bottom-20 right-4 max-w-sm">
          <Card className="bg-background/95 backdrop-blur-sm border-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Session Info (Dev)</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1 text-muted-foreground">
              <p>ID: {currentSession.id.slice(-8)}</p>
              <p>State: {currentSession.state}</p>
              <p>File: {currentSession.originalFile.name}</p>
              <p>Size: {fileHandlingService.formatFileSize(currentSession.originalFile.size)}</p>
              <p>Started: {currentSession.startTime.toLocaleTimeString()}</p>
              {currentSession.endTime && (
                <p>Duration: {((currentSession.endTime.getTime() - currentSession.startTime.getTime()) / 1000).toFixed(2)}s</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
