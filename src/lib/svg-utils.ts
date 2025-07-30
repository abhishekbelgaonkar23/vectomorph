/**
 * SVG utility functions for proper display and scaling
 */

/**
 * Ensures an SVG has a proper viewBox for scaling
 * If viewBox is missing, attempts to create one from width/height attributes
 */
export function ensureViewBox(svg: string): string {
  if (svg.includes('viewBox')) return svg;
  
  const widthMatch = svg.match(/width="([\d.]+)"/);
  const heightMatch = svg.match(/height="([\d.]+)"/);
  
  const width = widthMatch?.[1] || '100';
  const height = heightMatch?.[1] || '100';
  
  return svg.replace(
    /<svg([^>]*)>/,
    `<svg$1 viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`
  );
}

/**
 * Optimizes SVG for display by ensuring proper viewBox and scaling attributes
 */
export function optimizeSVGForDisplay(svg: string): string {
  let optimizedSVG = ensureViewBox(svg);
  
  // Ensure preserveAspectRatio is set for proper scaling
  if (!optimizedSVG.includes('preserveAspectRatio')) {
    optimizedSVG = optimizedSVG.replace(
      /<svg([^>]*)>/,
      '<svg$1 preserveAspectRatio="xMidYMid meet">'
    );
  }
  
  return optimizedSVG;
}