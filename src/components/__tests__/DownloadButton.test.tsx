import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadButton } from '../DownloadButton';
import { fileHandlingService } from '~/lib/file-handling.service';
import { AppError, ErrorCategory } from '~/types/app';

// Mock the file handling service
vi.mock('~/lib/file-handling.service', () => ({
  fileHandlingService: {
    generateSvgFileName: vi.fn(),
    createDownloadBlob: vi.fn(),
    triggerDownload: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: ({ className }: { className?: string }) => (
    <div data-testid="download-icon" className={className}>Download Icon</div>
  ),
}));

describe('DownloadButton', () => {
  const mockSvgContent = '<svg><circle cx="50" cy="50" r="40" /></svg>';
  const mockFileName = 'test-image.png';
  const mockSvgFileName = 'test-image.svg';

  beforeEach(() => {
    vi.clearAllMocks();
    (fileHandlingService.generateSvgFileName as any).mockReturnValue(mockSvgFileName);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders download button with correct text and icon', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Download SVG')).toBeInTheDocument();
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('has correct aria-label with generated filename', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label', 
        `Download SVG file: ${mockSvgFileName}`
      );
      expect(fileHandlingService.generateSvgFileName).toHaveBeenCalledWith(mockFileName);
    });

    it('applies correct CSS classes', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-w-[120px]');
    });
  });

  describe('Disabled States', () => {
    it('is disabled when disabled prop is true', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
          disabled={true}
        />
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when svgContent is empty', () => {
      render(
        <DownloadButton 
          svgContent="" 
          fileName={mockFileName} 
        />
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when fileName is empty', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName="" 
        />
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is enabled when all required props are provided', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Download Functionality', () => {
    it('calls file handling service methods on click', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/svg+xml' });
      (fileHandlingService.createDownloadBlob as any).mockReturnValue(mockBlob);

      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(fileHandlingService.generateSvgFileName).toHaveBeenCalledWith(mockFileName);
        expect(fileHandlingService.createDownloadBlob).toHaveBeenCalledWith(
          mockSvgContent, 
          'image/svg+xml'
        );
        expect(fileHandlingService.triggerDownload).toHaveBeenCalledWith(
          mockBlob, 
          mockSvgFileName
        );
      });
    });

    it('shows downloading state during download', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/svg+xml' });
      (fileHandlingService.createDownloadBlob as any).mockReturnValue(mockBlob);

      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      // Click the button
      fireEvent.click(screen.getByRole('button'));

      // Should show downloading state after React updates
      await waitFor(() => {
        expect(screen.getByText('Downloading...')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
      });
      
      // Wait for state to reset after download completes
      await waitFor(() => {
        expect(screen.getByText('Download SVG')).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });

    it('does not trigger download when disabled', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
          disabled={true}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      // generateSvgFileName is called for aria-label, but not the download methods
      expect(fileHandlingService.createDownloadBlob).not.toHaveBeenCalled();
      expect(fileHandlingService.triggerDownload).not.toHaveBeenCalled();
    });

    it('does not trigger download when svgContent is empty', () => {
      render(
        <DownloadButton 
          svgContent="" 
          fileName={mockFileName} 
        />
      );

      fireEvent.click(screen.getByRole('button'));

      // generateSvgFileName is called for aria-label, but not the download methods
      expect(fileHandlingService.createDownloadBlob).not.toHaveBeenCalled();
      expect(fileHandlingService.triggerDownload).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles blob creation errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new AppError(
        'Blob creation failed',
        ErrorCategory.BROWSER_COMPATIBILITY,
        'Unable to prepare file for download',
        false
      );

      (fileHandlingService.createDownloadBlob as any).mockImplementation(() => {
        throw error;
      });

      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Download failed:', error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('User-friendly error:', error.userMessage);
        expect(screen.getByText('Download SVG')).toBeInTheDocument(); // Should return to normal state
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles download trigger errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockBlob = new Blob(['test'], { type: 'image/svg+xml' });
      const error = new Error('Download trigger failed');

      (fileHandlingService.createDownloadBlob as any).mockReturnValue(mockBlob);
      (fileHandlingService.triggerDownload as any).mockImplementation(() => {
        throw error;
      });

      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Download failed:', error);
        expect(screen.getByText('Download SVG')).toBeInTheDocument(); // Should return to normal state
      });

      consoleErrorSpy.mockRestore();
    });

    it('resets downloading state after error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fileHandlingService.createDownloadBlob as any).mockImplementation(() => {
        throw new Error('Test error');
      });

      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      fireEvent.click(screen.getByRole('button'));

      // Should briefly show downloading state
      await waitFor(() => {
        expect(screen.getByText('Downloading...')).toBeInTheDocument();
      });

      // Should return to normal state after error
      await waitFor(() => {
        expect(screen.getByText('Download SVG')).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('updates aria-label based on filename', () => {
      const customFileName = 'custom-image.jpg';
      const customSvgFileName = 'custom-image.svg';
      
      (fileHandlingService.generateSvgFileName as any).mockReturnValue(customSvgFileName);

      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={customFileName} 
        />
      );

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label', 
        `Download SVG file: ${customSvgFileName}`
      );
    });

    it('maintains accessibility during downloading state', async () => {
      let resolveDownload: () => void;
      const downloadPromise = new Promise<void>((resolve) => {
        resolveDownload = resolve;
      });

      (fileHandlingService.createDownloadBlob as any).mockImplementation(() => {
        return downloadPromise.then(() => new Blob(['test'], { type: 'image/svg+xml' }));
      });

      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
        />
      );

      fireEvent.click(screen.getByRole('button'));

      // Button should still be accessible during download
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label');

      resolveDownload!();
      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });
  });

  describe('Props Validation', () => {
    it('handles undefined props gracefully', () => {
      render(
        <DownloadButton 
          svgContent={mockSvgContent} 
          fileName={mockFileName} 
          disabled={undefined}
        />
      );

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('handles empty string props correctly', () => {
      render(
        <DownloadButton 
          svgContent="" 
          fileName="" 
        />
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});