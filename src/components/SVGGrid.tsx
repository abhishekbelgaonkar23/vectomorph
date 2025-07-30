'use client';

import React from 'react';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Download, X } from 'lucide-react';
import type { SVGGridProps, ConversionResult } from '~/types/app';
import { cn } from '~/lib/utils';

/**
 * SVGGrid component displays multiple SVG conversion results in a responsive grid
 * Similar to Instagram's photo grid layout
 */
export function SVGGrid({ 
  results, 
  onDownloadSingle, 
  onRemove 
}: SVGGridProps) {
  if (results.length === 0) {
    return null;
  }

  const handleDownloadSingle = (result: ConversionResult) => {
    if (onDownloadSingle) {
      onDownloadSingle(result);
    } else {
      // Default download behavior
      const blob = new Blob([result.svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${result.file.name.replace(/\.[^/.]+$/, '')}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };



  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with image count */}
      <div className="flex items-center justify-center pt-2">
        <div className="text-sm text-muted-foreground font-medium">
          {results.length} image{results.length !== 1 ? 's' : ''} converted
        </div>
      </div>

      {/* Responsive grid layout - Instagram style */}
      <div className={cn(
        "grid gap-2 md:gap-3",
        {
          "grid-cols-1 max-w-md mx-auto": results.length === 1,
          "grid-cols-2 max-w-2xl mx-auto": results.length === 2,
          "grid-cols-2 md:grid-cols-3": results.length >= 3 && results.length <= 6,
          "grid-cols-3 md:grid-cols-4": results.length > 6,
        }
      )}>
        {results.map((result) => (
          <Card 
            key={result.id} 
            className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-0 bg-white dark:bg-gray-900"
          >
            <CardContent className="p-0">
              {/* SVG Preview */}
              <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                <div className="absolute inset-0 p-3 flex items-center justify-center">
                  <div
                    className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto [&_svg]:drop-shadow-sm"
                    dangerouslySetInnerHTML={{ __html: result.svgContent }}
                  />
                </div>
                
                {/* Overlay with actions - appears on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadSingle(result)}
                    className="bg-white/95 hover:bg-white text-black shadow-lg hover:scale-105 transition-transform"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  {onRemove && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRemove(result.id)}
                      className="bg-white/95 hover:bg-white text-black shadow-lg hover:scale-105 transition-transform"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* File info - compact for grid view */}
              <div className="p-2 bg-white dark:bg-gray-900">
                <div className="text-xs font-medium truncate text-gray-900 dark:text-gray-100" title={result.file.name}>
                  {result.file.name.replace(/\.[^/.]+$/, '')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center justify-between">
                  <span>{Math.round(new Blob([result.svgContent]).size / 1024)}KB</span>
                  {result.processingTime && (
                    <span>{result.processingTime}ms</span>
                  )}
                </div>
                {result.error && (
                  <div className="text-xs text-red-500 mt-1 truncate">
                    {result.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}