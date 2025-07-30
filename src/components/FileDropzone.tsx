'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileImage, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { fileHandlingService } from '~/lib/file-handling.service';
import type { FileDropzoneProps } from '~/types/app';
import { cn } from '~/lib/utils';

export function FileDropzone({
  onFileSelect,
  acceptedTypes,
  maxFileSize,
  disabled = false,
  multiple = false
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file validation and selection
  const handleFileSelection = useCallback((files: File[]) => {
    setError(null);
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      const validation = fileHandlingService.validateFile(file, acceptedTypes, maxFileSize);
      
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }
    
    if (errors.length > 0) {
      setError(errors.join(', '));
    }
    
    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }
  }, [onFileSelect, acceptedTypes, maxFileSize]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragOver(true);
    setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    // Only set drag states to false if we're leaving the dropzone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
      setIsDragActive(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragOver(true);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setIsDragActive(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      setError('No files were dropped');
      return;
    }
    
    if (!multiple && files.length > 1) {
      setError('Please drop only one file at a time');
      return;
    }
    
    handleFileSelection(files);
  }, [disabled, multiple, handleFileSelection]);

  // Handle click to upload
  const handleClick = useCallback(() => {
    if (disabled) return;
    
    setError(null);
    fileInputRef.current?.click();
  }, [disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    handleFileSelection(files);
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection]);

  // Format accepted types for display
  const formatAcceptedTypes = useCallback(() => {
    return acceptedTypes
      .map(type => type.startsWith('.') ? type.toUpperCase() : type.split('/')[1]?.toUpperCase())
      .filter(Boolean)
      .join(', ');
  }, [acceptedTypes]);

  // Format max file size for display
  const formatMaxFileSize = useCallback(() => {
    return fileHandlingService.formatFileSize(maxFileSize);
  }, [maxFileSize]);

  return (
    <div className="w-full">
      <Card
        className={cn(
          'relative cursor-pointer transition-all duration-200 border-2 border-dashed',
          'hover:border-primary/50 hover:bg-accent/50',
          {
            'border-primary bg-primary/5': isDragOver && !error,
            'border-destructive bg-destructive/5': error,
            'cursor-not-allowed opacity-50': disabled,
            'border-muted-foreground/25': !isDragOver && !error,
          }
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload image file"
        aria-describedby="dropzone-description"
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className={cn(
            'mb-4 rounded-full p-4 transition-colors',
            {
              'bg-primary/10 text-primary': isDragOver && !error,
              'bg-destructive/10 text-destructive': error,
              'bg-muted text-muted-foreground': !isDragOver && !error,
            }
          )}>
            {error ? (
              <AlertCircle className="h-8 w-8" />
            ) : (
              <FileImage className="h-8 w-8" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragActive 
                ? (multiple ? 'Drop your images here' : 'Drop your image here')
                : (multiple ? 'Upload Multiple Images' : 'Upload an image')
              }
            </h3>
            
            <p id="dropzone-description" className="text-sm text-muted-foreground">
              {multiple 
                ? 'Select multiple images to convert them all at once'
                : 'Drag and drop an image file here, or click to browse'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 text-xs text-muted-foreground">
              <span>Supported formats: {formatAcceptedTypes()}</span>
              <span className="hidden sm:inline">•</span>
              <span>Max size: {formatMaxFileSize()}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            {multiple ? 'Choose Files' : 'Choose File'}
          </Button>
        </CardContent>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
          multiple={multiple}
        />
      </Card>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}