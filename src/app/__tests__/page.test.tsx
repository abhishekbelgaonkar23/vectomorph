import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '../page';
import { imageProcessingService } from '~/lib/image-processing.service';
import { fileHandlingService } from '~/lib/file-handling.service';

// Mock the services
vi.mock('~/lib/image-processing.service');
vi.mock('~/lib/file-handling.service');

// Mock the components to focus on state management testing
vi.mock('~/components/FileDropzone', () => ({
  FileDropzone: ({ onFileSelect, disabled }: any) => (
    <div data-testid="file-dropzone">
      <button 
        onClick={() => onFileSelect(new File(['test'], 'test.png', { type: 'image/png' }))}
        disabled={disabled}
        data-testid="select-file-button"
      >
        Select File
      </button>
      <span data-testid="dropzone-disabled">{disabled ? 'disabled' : 'enabled'}</span>
    </div>
  )
}));

vi.mock('~/components/LoadingIndicator', () => ({
  LoadingIndicator: ({ isVisible, message }: any) => (
    <div data-testid="loading-indicator" style={{ display: isVisible ? 'block' : 'none' }}>
      <span data-testid="loading-message">{message}</span>
    </div>
  )
}));

vi.mock('~/components/SVGPreview', () => ({
  SVGPreview: ({ svgContent, originalFileName }: any) => (
    <div data-testid="svg-preview">
      <span data-testid="svg-content">{svgContent}</span>
      <span data-testid="original-filename">{originalFileName}</span>
    </div>
  )
}));

vi.mock('~/components/DownloadButton', () => ({
  DownloadButton: ({ svgContent, fileName }: any) => (
    <button data-testid="download-button">
      Download {fileName}
    </button>
  )
}));

describe('HomePage State Management', () => {
  const mockImageProcessingService = vi.mocked(imageProcessingService);
  const mockFileHandlingService = vi.mocked(fileHandlingService);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockImageProcessingService.getDefaultOptions.mockReturnValue({
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      colorsampling: 1,
      numberofcolors: 16,
      mincolorratio: 0.02,
      colorquantcycles: 3
    });

    mockFileHandlingService.formatFileSize.mockImplementation((bytes) => `${bytes} bytes`);
  });

  it('renders initial state correctly', () => {
    render(<HomePage />);
    
    // Should show the header
    expect(screen.getByText('VectoMorph')).toBeInTheDocument();
    expect(screen.getByText(/Convert raster images to scalable vector graphics/)).toBeInTheDocument();
    
    // Should show the file dropzone
    expect(screen.getByTestId('file-dropzone')).toBeInTheDocument();
    expect(screen.getByTestId('dropzone-disabled')).toHaveTextContent('enabled');
    
    // Should not show loading indicator, preview, or error
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('svg-preview')).not.toBeInTheDocument();
    expect(screen.queryByText(/Conversion Failed/)).not.toBeInTheDocument();
  });

  it('handles successful file processing workflow', async () => {
    const mockSvgResult = '<svg><circle r="10"/></svg>';
    
    // Add delay to processing to test loading states
    mockImageProcessingService.processImage.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockSvgResult), 50))
    );

    render(<HomePage />);
    
    // Click to select file
    fireEvent.click(screen.getByTestId('select-file-button'));
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
    
    // During processing, dropzone should not be visible (replaced by loading indicator)
    expect(screen.queryByTestId('dropzone-disabled')).not.toBeInTheDocument();
    
    // Should show processing message
    expect(screen.getByTestId('loading-message')).toHaveTextContent(/Converting image to SVG/);
    
    // Wait for processing to complete
    await waitFor(() => {
      expect(screen.getByTestId('svg-preview')).toBeInTheDocument();
    });
    
    // Should show SVG preview with correct content
    expect(screen.getByTestId('svg-content')).toHaveTextContent(mockSvgResult);
    expect(screen.getByTestId('original-filename')).toHaveTextContent('test.png');
    
    // Should show download button
    expect(screen.getByTestId('download-button')).toBeInTheDocument();
    
    // Should show "Convert Another" button
    expect(screen.getByText('Convert Another')).toBeInTheDocument();
    
    // Loading indicator should not be visible after completion
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
  });

  it('handles processing errors correctly', async () => {
    const errorMessage = 'Processing failed';
    mockImageProcessingService.processImage.mockRejectedValue(new Error(errorMessage));

    render(<HomePage />);
    
    // Click to select file
    fireEvent.click(screen.getByTestId('select-file-button'));
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Conversion Failed')).toBeInTheDocument();
    });
    
    // Should show error message
    expect(screen.getByText(/An unexpected error occurred during image processing/)).toBeInTheDocument();
    
    // Should show retry and new conversion buttons
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Try Another Image')).toBeInTheDocument();
    
    // Loading indicator should not be visible
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    
    // Dropzone should not be visible in error state
    expect(screen.queryByTestId('dropzone-disabled')).not.toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    const errorMessage = 'Processing failed';
    const mockSvgResult = '<svg><circle r="10"/></svg>';
    
    // First call fails, second succeeds
    mockImageProcessingService.processImage
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockSvgResult);

    render(<HomePage />);
    
    // Click to select file (first attempt)
    fireEvent.click(screen.getByTestId('select-file-button'));
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Conversion Failed')).toBeInTheDocument();
    });
    
    // Click retry button
    fireEvent.click(screen.getByText('Retry'));
    
    // Should show loading state again
    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toHaveStyle({ display: 'block' });
    });
    
    // Wait for successful completion
    await waitFor(() => {
      expect(screen.getByTestId('svg-preview')).toBeInTheDocument();
    });
    
    // Should show successful result
    expect(screen.getByTestId('svg-content')).toHaveTextContent(mockSvgResult);
  });

  it('handles new conversion workflow', async () => {
    const mockSvgResult = '<svg><circle r="10"/></svg>';
    mockImageProcessingService.processImage.mockResolvedValue(mockSvgResult);

    render(<HomePage />);
    
    // Complete first conversion
    fireEvent.click(screen.getByTestId('select-file-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('svg-preview')).toBeInTheDocument();
    });
    
    // Click "Convert Another"
    fireEvent.click(screen.getByText('Convert Another'));
    
    // Should return to initial state
    expect(screen.getByTestId('file-dropzone')).toBeInTheDocument();
    expect(screen.getByTestId('dropzone-disabled')).toHaveTextContent('enabled');
    expect(screen.queryByTestId('svg-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
  });

  it('shows correct loading messages during different phases', async () => {
    const mockSvgResult = '<svg><circle r="10"/></svg>';
    
    // Add delay to processing to test different phases
    mockImageProcessingService.processImage.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockSvgResult), 100))
    );

    render(<HomePage />);
    
    // Click to select file
    fireEvent.click(screen.getByTestId('select-file-button'));
    
    // Should show loading indicator with processing message
    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
    
    // Should show converting message
    await waitFor(() => {
      expect(screen.getByTestId('loading-message')).toHaveTextContent(/Converting image to SVG/);
    });
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByTestId('svg-preview')).toBeInTheDocument();
    });
  });
});