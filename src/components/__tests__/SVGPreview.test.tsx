import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SVGPreview } from '../SVGPreview';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn()
};

Object.assign(navigator, {
  clipboard: mockClipboard
});

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

Object.assign(URL, {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL
});

// Sample SVG content for testing
const sampleSVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="red" />
</svg>`;

const sampleSVGWithViewBox = `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="150" fill="blue" />
</svg>`;

describe('SVGPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders SVG preview with correct content', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test-image.png" 
      />
    );

    expect(screen.getByText('SVG Preview')).toBeInTheDocument();
    expect(screen.getByText('test-image')).toBeInTheDocument();
    expect(screen.getByText('test-image')).toBeInTheDocument();
  });

  it('displays SVG content safely using dangerouslySetInnerHTML', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.jpg" 
      />
    );

    // Check that SVG content is rendered
    const svgContainer = screen.getByRole('img');
    expect(svgContainer).toBeInTheDocument();
    expect(svgContainer).toHaveAttribute('aria-label', 'SVG preview of converted image: test');
  });

  it('extracts and displays SVG dimensions correctly', async () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/100 × 100px/)).toBeInTheDocument();
    });
  });

  it('handles SVG with viewBox attribute', async () => {
    render(
      <SVGPreview 
        svgContent={sampleSVGWithViewBox} 
        originalFileName="test.png" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/200 × 150px/)).toBeInTheDocument();
    });
  });

  it('displays file size information', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    expect(screen.getByText(/• \d+ bytes/)).toBeInTheDocument();
    expect(screen.getByText('SVG • Scalable Vector Graphics')).toBeInTheDocument();
  });

  it('removes file extension from display name', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="my-image.jpeg" 
      />
    );

    expect(screen.getByText('my-image')).toBeInTheDocument();
    expect(screen.queryByText('my-image.jpeg')).not.toBeInTheDocument();
  });

  it('handles copy to clipboard functionality', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);

    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy svg content/i });
    fireEvent.click(copyButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(sampleSVG);

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    // Check that the button text reverts after timeout
    await waitFor(() => {
      expect(screen.queryByText('Copied')).not.toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles clipboard copy failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockClipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));

    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy svg content/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy SVG content:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('renders download button with correct attributes', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="my-image.png" 
      />
    );

    const downloadButton = screen.getByRole('button', { name: /download svg file: my-image\.svg/i });
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton).toHaveAttribute('aria-label', 'Download SVG file: my-image.svg');
  });

  it('has proper accessibility attributes', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    // Check main container has proper role and labeling
    const previewRegion = screen.getByRole('region');
    expect(previewRegion).toHaveAttribute('aria-labelledby', 'svg-preview-title');

    // Check SVG container has proper accessibility attributes
    const svgContainer = screen.getByRole('img');
    expect(svgContainer).toHaveAttribute('aria-label', 'SVG preview of converted image: test');
    expect(svgContainer).toHaveAttribute('tabIndex', '0');

    // Check buttons have proper labels
    expect(screen.getByRole('button', { name: /copy svg content/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download svg file/i })).toBeInTheDocument();
  });

  it('handles malformed SVG content gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock DOMParser to throw an error
    const originalDOMParser = global.DOMParser;
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn().mockImplementation(() => {
        throw new Error('Invalid XML');
      })
    }));

    render(
      <SVGPreview 
        svgContent="<invalid-xml>" 
        originalFileName="test.png" 
      />
    );

    expect(consoleSpy).toHaveBeenCalledWith('Failed to parse SVG dimensions:', expect.any(Error));

    consoleSpy.mockRestore();
    global.DOMParser = originalDOMParser;
  });

  it('applies responsive styling correctly', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    const svgContainer = screen.getByRole('img');
    expect(svgContainer).toHaveClass('absolute', 'inset-0', 'flex', 'items-center', 'justify-center');
    
    // Check that the responsive container has proper styling
    const responsiveContainer = svgContainer.parentElement;
    expect(responsiveContainer).toHaveClass('relative', 'w-full');
  });

  it('shows hover effects on SVG container', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    const svgWrapper = screen.getByRole('img').firstElementChild;
    expect(svgWrapper).toHaveClass('max-w-full', 'max-h-full');
  });

  it('displays metadata correctly on different screen sizes', () => {
    render(
      <SVGPreview 
        svgContent={sampleSVG} 
        originalFileName="test.png" 
      />
    );

    // Check responsive layout classes
    const metadataContainer = screen.getByText('SVG • Scalable Vector Graphics');
    expect(metadataContainer).toHaveClass('text-xs', 'text-muted-foreground');

    const actionsContainer = screen.getByRole('button', { name: /download/i }).parentElement;
    expect(actionsContainer).toHaveClass('mt-3', 'flex', 'items-center', 'justify-between');
  });
});