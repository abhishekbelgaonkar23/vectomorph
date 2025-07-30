'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Eye, Download, Copy, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { SVGPreviewProps } from '~/types/app';

/**
 * SVGPreview component renders generated SVG content safely with responsive display
 * Uses shadcn/ui Card component with proper accessibility attributes
 */
export function SVGPreview({ svgContent, originalFileName }: SVGPreviewProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number } | null>(null);

  // Extract SVG dimensions for responsive display
  useEffect(() => {
    if (!svgContent) return;

    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (svgElement) {
        const width = svgElement.getAttribute('width');
        const height = svgElement.getAttribute('height');
        const viewBox = svgElement.getAttribute('viewBox');
        
        let dimensions = { width: 300, height: 300 }; // default fallback
        
        if (width && height) {
          dimensions = {
            width: parseFloat(width),
            height: parseFloat(height)
          };
        } else if (viewBox) {
          const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
          if (vbWidth && vbHeight) {
            dimensions = { width: vbWidth, height: vbHeight };
          }
        }
        
        setSvgDimensions(dimensions);
      }
    } catch (error) {
      console.warn('Failed to parse SVG dimensions:', error);
      setSvgDimensions({ width: 300, height: 300 });
    }
  }, [svgContent]);

  // Handle copying SVG content to clipboard
  const handleCopySVG = async () => {
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy SVG content:', error);
    }
  };

  // Calculate aspect ratio for responsive display
  const aspectRatio = svgDimensions 
    ? (svgDimensions.height / svgDimensions.width) * 100 
    : 100;

  // Generate filename without extension for display
  const displayName = originalFileName.replace(/\.[^/.]+$/, '');

  return (
    <Card 
      className="w-full max-w-4xl mx-auto"
      role="region"
      aria-labelledby="svg-preview-title"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle 
            id="svg-preview-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
            SVG Preview
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySVG}
              className="flex items-center gap-2"
              aria-label="Copy SVG content to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy SVG
                </>
              )}
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Converted from: <span className="font-medium">{displayName}</span>
          {svgDimensions && (
            <span className="ml-2">
              • {Math.round(svgDimensions.width)} × {Math.round(svgDimensions.height)}px
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent className="p-6">
        {/* Responsive SVG container */}
        <div 
          className={cn(
            "relative w-full bg-background border border-border rounded-lg overflow-hidden",
            "shadow-sm hover:shadow-md transition-shadow duration-200"
          )}
          style={{ paddingBottom: `${Math.min(aspectRatio, 75)}%` }}
        >
          <div
            ref={svgContainerRef}
            className="absolute inset-0 flex items-center justify-center p-4"
            role="img"
            aria-label={`SVG preview of converted image: ${displayName}`}
            tabIndex={0}
          >
            <div
              className={cn(
                "max-w-full max-h-full flex items-center justify-center",
                "transition-transform duration-200 hover:scale-105"
              )}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
          
          {/* Overlay for better visual feedback */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {/* SVG metadata and actions */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <span>Format: SVG (Scalable Vector Graphics)</span>
            <span className="hidden sm:inline ml-2">•</span>
            <span className="block sm:inline sm:ml-2">
              Size: {new Blob([svgContent]).size} bytes
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${displayName}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2"
              aria-label={`Download SVG file: ${displayName}.svg`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}