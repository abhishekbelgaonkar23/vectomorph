'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FileDropzone } from '~/components/FileDropzone';
import { LoadingIndicator } from '~/components/LoadingIndicator';
import { SVGPreview } from '~/components/SVGPreview';
import { DownloadButton } from '~/components/DownloadButton';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { AlertCircle, RefreshCw, FileImage, Zap, Shield, Globe } from 'lucide-react';
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
        <div className="flex flex-col items-center justify-center py-12">
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
        <div className="flex flex-col items-center justify-center py-12">
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-destructive text-xl">
                <AlertCircle className="h-6 w-6" />
                Conversion Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm leading-relaxed">
                  {appState.error}
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {appState.uploadedFile && (
                  <Button 
                    onClick={handleRetry}
                    variant="outline"
                    size="default"
                    className="flex items-center gap-2 min-w-[120px]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                )}
                <Button 
                  onClick={handleNewConversion}
                  variant="default"
                  size="default"
                  className="flex items-center gap-2 min-w-[140px]"
                >
                  <FileImage className="h-4 w-4" />
                  Try Another Image
                </Button>
              </div>
              
              {/* Development test button */}
              {process.env.NODE_ENV === 'development' && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={async () => {
                      const available = await imageProcessingService.testImageTracerAvailability();
                      alert(`ImageTracer available: ${available}`);
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                  >
                    Test ImageTracer (Dev)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show SVG preview and download when conversion is complete
    if (appState.svgResult && appState.uploadedFile) {
      return (
        <div className="space-y-8">
          {/* Success message */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
              Conversion completed successfully
            </div>
          </div>

          {/* SVG Preview */}
          <SVGPreview 
            svgContent={appState.svgResult}
            originalFileName={appState.uploadedFile.name}
          />
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <DownloadButton
              svgContent={appState.svgResult}
              fileName={appState.uploadedFile.name}
            />
            <Button 
              onClick={handleNewConversion}
              variant="outline"
              size="default"
              className="flex items-center gap-2 min-w-[160px]"
            >
              <FileImage className="h-4 w-4" />
              Convert Another Image
            </Button>
          </div>
        </div>
      );
    }

    // Default state - show file dropzone
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <FileDropzone
          onFileSelect={handleFileSelect}
          acceptedTypes={appConfig.supportedFormats}
          maxFileSize={appConfig.maxFileSize}
          disabled={isDropzoneDisabled}
        />
        
        {/* Development test button */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-center">
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
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                VectoMorph
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Convert raster images to scalable vector graphics (SVG) entirely in your browser
            </p>
            
            {/* Feature highlights */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-12">
              <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" aria-hidden="true" />
                <span>Privacy-focused</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-muted-foreground/30 rounded-full" aria-hidden="true" />
              <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" aria-hidden="true" />
                <span>Client-side processing</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-muted-foreground/30 rounded-full" aria-hidden="true" />
              <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" aria-hidden="true" />
                <span>No data uploaded</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Application Section */}
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Application content */}
            <div className="space-y-8">
              {renderMainContent()}
            </div>
            
            {/* How it works section - only show when idle */}
            {appState.processingState === ProcessingState.IDLE && !appState.uploadedFile && (
              <div className="mt-16 sm:mt-20">
                <div className="text-center mb-12">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                    How it works
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Simple, secure, and fast image-to-SVG conversion in three easy steps
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileImage className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="font-semibold mb-2">1. Upload Image</h3>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop or click to select your raster image (PNG, JPG, BMP, GIF)
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="font-semibold mb-2">2. Auto Convert</h3>
                      <p className="text-sm text-muted-foreground">
                        Our client-side engine processes your image locally using advanced tracing algorithms
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="font-semibold mb-2">3. Download SVG</h3>
                      <p className="text-sm text-muted-foreground">
                        Preview your scalable vector graphic and download it instantly
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-16 sm:mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              Built with privacy in mind. All processing happens locally in your browser.
            </p>
            <p>
              No data is sent to external servers or stored anywhere.
            </p>
          </div>
        </div>
      </footer>

      {/* Session info for debugging (only in development) */}
      {process.env.NODE_ENV === 'development' && currentSession && (
        <div className="fixed bottom-4 right-4 max-w-sm">
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
