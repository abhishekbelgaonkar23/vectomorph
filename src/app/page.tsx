'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { FileDropzone } from '~/components/FileDropzone';
import { LoadingIndicator } from '~/components/LoadingIndicator';
import { SVGPreview } from '~/components/SVGPreview';
import { DownloadButton } from '~/components/DownloadButton';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { AlertCircle, RefreshCw, FileImage, Zap, Shield, Globe, Github, Twitter } from 'lucide-react';
import { imageProcessingService } from '~/lib/image-processing.service';
import { fileHandlingService } from '~/lib/file-handling.service';
import type { AppState, ConversionSession, AppConfig } from '~/types/app';
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
    uploadedFile: null,
    isProcessing: false,
    svgResult: null,
    error: null,
    processingState: ProcessingState.IDLE
  });

  // Current conversion session
  const [currentSession, setCurrentSession] = useState<ConversionSession | null>(null);

  // Processing message for loading indicator
  const [processingMessage, setProcessingMessage] = useState<string>('Processing image...');

  // Error boundary ref for recovery
  const errorBoundaryRef = useRef<{ reset: () => void } | null>(null);

  /**
   * Handles file selection from FileDropzone
   * Initiates the conversion process
   */
  const handleFileSelect = useCallback(async (file: File) => {
    // Create new conversion session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const session: ConversionSession = {
      id: sessionId,
      originalFile: file,
      state: ProcessingState.UPLOADING,
      startTime: new Date()
    };

    setCurrentSession(session);
    setAppState(prev => ({
      ...prev,
      uploadedFile: file,
      isProcessing: true,
      svgResult: null,
      error: null,
      processingState: ProcessingState.UPLOADING
    }));

    setProcessingMessage('Preparing image for conversion...');

    try {
      // Transition to processing state
      const processingSession = { ...session, state: ProcessingState.PROCESSING };
      setCurrentSession(processingSession);
      setAppState(prev => ({
        ...prev,
        processingState: ProcessingState.PROCESSING
      }));

      setProcessingMessage('Converting image to SVG...');

      // Process the image using ImageProcessingService
      const svgResult = await imageProcessingService.processImage(file);

      // Transition to completed state
      const completedSession: ConversionSession = {
        ...processingSession,
        state: ProcessingState.COMPLETED,
        endTime: new Date(),
        svgResult
      };

      setCurrentSession(completedSession);
      setAppState(prev => ({
        ...prev,
        isProcessing: false,
        svgResult,
        processingState: ProcessingState.COMPLETED
      }));

      setProcessingMessage('Conversion completed!');

    } catch (error) {
      // Handle processing errors
      const errorMessage = error instanceof AppError 
        ? error.userMessage 
        : 'An unexpected error occurred during image processing';

      const errorSession: ConversionSession = {
        ...session,
        state: ProcessingState.ERROR,
        endTime: new Date(),
        error: errorMessage
      };

      setCurrentSession(errorSession);
      setAppState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        processingState: ProcessingState.ERROR
      }));

      // Log detailed error for debugging
      console.error('Image processing failed:', error);
    }
  }, []);

  /**
   * Handles error recovery - resets the application to initial state
   */
  const handleErrorRecovery = useCallback(() => {
    setAppState({
      uploadedFile: null,
      isProcessing: false,
      svgResult: null,
      error: null,
      processingState: ProcessingState.IDLE
    });
    setCurrentSession(null);
    setProcessingMessage('Processing image...');
    
    // Reset error boundary if available
    errorBoundaryRef.current?.reset();
  }, []);

  /**
   * Handles retry with the same file
   */
  const handleRetry = useCallback(() => {
    if (appState.uploadedFile) {
      handleFileSelect(appState.uploadedFile);
    }
  }, [appState.uploadedFile, handleFileSelect]);

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
    switch (appState.processingState) {
      case ProcessingState.UPLOADING:
        return 'Preparing image for conversion...';
      case ProcessingState.PROCESSING:
        return 'Converting image to SVG...';
      default:
        return processingMessage;
    }
  }, [appState.processingState, processingMessage]);

  /**
   * Renders the main content based on current state
   */
  const renderMainContent = () => {
    // Show loading indicator during processing
    if (appState.isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center">
          <LoadingIndicator 
            isVisible={true} 
            message={getLoadingMessage()} 
          />
        </div>
      );
    }

    // Show error state with recovery options
    if (appState.error) {
      return (
        <div className="flex flex-col items-center justify-center">
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
                {appState.uploadedFile && (
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
                  Try Another Image
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show SVG preview and download when conversion is complete
    if (appState.svgResult && appState.uploadedFile) {
      return (
        <div className="w-full space-y-4">
          {/* Success message */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Conversion completed successfully
            </div>
          </div>

          {/* SVG Preview - Compact */}
          <SVGPreview 
            svgContent={appState.svgResult}
            originalFileName={appState.uploadedFile.name}
          />
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              svgContent={appState.svgResult}
              fileName={appState.uploadedFile.name}
            />
            <Button 
              onClick={handleNewConversion}
              variant="outline"
              size="default"
              className="flex items-center gap-2"
            >
              <FileImage className="h-4 w-4" />
              Convert Another
            </Button>
          </div>
        </div>
      );
    }

    // Default state - show file dropzone
    return (
      <div className="w-full max-w-2xl mx-auto">
        <FileDropzone
          onFileSelect={handleFileSelect}
          acceptedTypes={appConfig.supportedFormats}
          maxFileSize={appConfig.maxFileSize}
          disabled={isDropzoneDisabled}
        />
        
        {/* Quick info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Supports PNG, JPG, BMP, GIF • Max 10MB • Processed locally
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
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
        <div className="w-full max-w-4xl mx-auto">
          {/* Subtitle */}
          <div className="text-center mb-6">
            <p className="text-lg text-muted-foreground">
              Convert raster images to scalable vector graphics entirely in your browser
            </p>
          </div>

          {/* Main Application Content */}
          <div className="flex-1 flex items-center justify-center">
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
                <span className="sr-only">Twitter</span>
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
