'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Eye, Download, Copy, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { SVGPreviewProps } from '~/types/app';

/**
 * SVGPreview component renders generated SVG content as a small complete preview
 * Simple design that shows the entire image in a compact format
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

  // Generate filename without extension for display
  const displayName = originalFileName.replace(/\.[^/.]+$/, '');

  return (
    <Card 
      className="w-full max-w-2xl mx-auto"
      role="region"
      aria-labelledby="svg-preview-title"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle 
            id="svg-preview-title"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
            SVG Preview
          </CardTitle>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySVG}
            className="h-8 px-2 text-xs"
            aria-label="Copy SVG content to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{displayName}</span>
          {svgDimensions && (
            <span className="ml-2">
              • {Math.round(svgDimensions.width)} × {Math.round(svgDimensions.height)}px
            </span>
          )}
          <span className="ml-2">• {new Blob([svgContent]).size} bytes</span>
        </p>
      </CardHeader>

      <CardContent className="p-4">
        {/* Simple SVG container that shows the complete image */}
        <div 
          className="relative w-full h-48 bg-muted/20 border border-border rounded-lg overflow-hidden shadow-sm"
        >
          <div
            ref={svgContainerRef}
            className="absolute inset-0 flex items-center justify-center p-4"
            role="img"
            aria-label={`SVG preview of converted image: ${displayName}`}
            tabIndex={0}
          >
            <div
              className="max-w-full max-h-full flex items-center justify-center"
              style={{ 
                width: '100%',
                height: '100%'
              }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            SVG • Scalable Vector Graphics
          </div>
          
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
            className="h-8 px-3 text-xs"
            aria-label={`Download SVG file: ${displayName}.svg`}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}