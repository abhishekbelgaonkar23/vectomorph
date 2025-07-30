import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from '../FileDropzone';
import { fileHandlingService } from '~/lib/file-handling.service';

// Mock the file handling service
vi.mock('~/lib/file-handling.service', () => ({
  fileHandlingService: {
    validateFile: vi.fn(),
    formatFileSize: vi.fn(),
  },
}));

const mockFileHandlingService = vi.mocked(fileHandlingService);

describe('FileDropzone', () => {
  const defaultProps = {
    onFileSelect: vi.fn(),
    acceptedTypes: ['.png', '.jpg', '.jpeg', '.bmp', '.gif'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  };

  const createMockFile = (name: string, type: string, size: number = 1024) => {
    return new File(['mock content'], name, { type, lastModified: Date.now() });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFileHandlingService.formatFileSize.mockReturnValue('10.0 MB');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the dropzone with correct initial state', () => {
      render(<FileDropzone {...defaultProps} />);
      
      expect(screen.getByText('Upload an image')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop an image file here, or click to browse')).toBeInTheDocument();
      expect(screen.getByText(/Supported formats:/)).toBeInTheDocument();
      expect(screen.getByText(/Max size:/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Choose File' })).toBeInTheDocument();
    });

    it('renders with disabled state', () => {
      render(<FileDropzone {...defaultProps} disabled />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      const chooseFileButton = screen.getByRole('button', { name: 'Choose File' });
      
      expect(dropzone).toHaveAttribute('tabIndex', '-1');
      expect(chooseFileButton).toBeDisabled();
      expect(dropzone).toHaveClass('cursor-not-allowed', 'opacity-50');
    });

    it('formats accepted types correctly', () => {
      render(
        <FileDropzone
          {...defaultProps}
          acceptedTypes={['image/png', 'image/jpeg', '.gif']}
        />
      );
      
      expect(screen.getByText(/PNG, JPEG, \.GIF/)).toBeInTheDocument();
    });
  });

  describe('File Selection via Click', () => {
    it('opens file picker when dropzone is clicked', async () => {
      const user = userEvent.setup();
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      await user.click(dropzone);
      
      expect(clickSpy).toHaveBeenCalled();
    });

    it('opens file picker when Choose File button is clicked', async () => {
      const user = userEvent.setup();
      render(<FileDropzone {...defaultProps} />);
      
      const chooseFileButton = screen.getByRole('button', { name: 'Choose File' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      await user.click(chooseFileButton);
      
      expect(clickSpy).toHaveBeenCalled();
    });

    it('handles file selection through file input', async () => {
      const mockFile = createMockFile('test.png', 'image/png');
      mockFileHandlingService.validateFile.mockReturnValue({ isValid: true });
      
      render(<FileDropzone {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(fileInput, mockFile);
      
      expect(mockFileHandlingService.validateFile).toHaveBeenCalledWith(
        mockFile,
        defaultProps.acceptedTypes,
        defaultProps.maxFileSize
      );
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(mockFile);
    });

    it('does not open file picker when disabled', async () => {
      const user = userEvent.setup();
      render(<FileDropzone {...defaultProps} disabled />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      await user.click(dropzone);
      
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens file picker when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      dropzone.focus();
      await user.keyboard('{Enter}');
      
      expect(clickSpy).toHaveBeenCalled();
    });

    it('opens file picker when Space key is pressed', async () => {
      const user = userEvent.setup();
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      dropzone.focus();
      await user.keyboard(' ');
      
      expect(clickSpy).toHaveBeenCalled();
    });

    it('does not respond to keyboard when disabled', async () => {
      const user = userEvent.setup();
      render(<FileDropzone {...defaultProps} disabled />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      dropzone.focus();
      await user.keyboard('{Enter}');
      
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('provides visual feedback on drag enter', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      
      fireEvent.dragEnter(dropzone, {
        dataTransfer: { files: [] }
      });
      
      expect(dropzone).toHaveClass('border-primary', 'bg-primary/5');
      expect(screen.getByText('Drop your image here')).toBeInTheDocument();
    });

    it('maintains visual feedback during drag over', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      
      // Simulate drag enter
      fireEvent.dragEnter(dropzone);
      expect(dropzone).toHaveClass('border-primary', 'bg-primary/5');
      
      // Simulate drag over
      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('border-primary', 'bg-primary/5');
    });

    it('handles successful file drop', async () => {
      const mockFile = createMockFile('test.png', 'image/png');
      mockFileHandlingService.validateFile.mockReturnValue({ isValid: true });
      
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile]
        }
      });
      
      await waitFor(() => {
        expect(mockFileHandlingService.validateFile).toHaveBeenCalledWith(
          mockFile,
          defaultProps.acceptedTypes,
          defaultProps.maxFileSize
        );
        expect(defaultProps.onFileSelect).toHaveBeenCalledWith(mockFile);
      });
    });

    it('shows error when no files are dropped', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [] }
      });
      
      expect(screen.getByText('No files were dropped')).toBeInTheDocument();
    });

    it('shows error when multiple files are dropped', () => {
      const mockFile1 = createMockFile('test1.png', 'image/png');
      const mockFile2 = createMockFile('test2.png', 'image/png');
      
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile1, mockFile2]
        }
      });
      
      expect(screen.getByText('Please drop only one file at a time')).toBeInTheDocument();
    });

    it('does not handle drag events when disabled', () => {
      render(<FileDropzone {...defaultProps} disabled />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      
      fireEvent.dragEnter(dropzone);
      
      expect(dropzone).not.toHaveClass('border-primary', 'bg-primary/5');
      expect(screen.queryByText('Drop your image here')).not.toBeInTheDocument();
    });
  });

  describe('File Validation', () => {
    it('calls validation service and handles valid file', async () => {
      const mockFile = createMockFile('test.png', 'image/png');
      mockFileHandlingService.validateFile.mockReturnValue({ isValid: true });
      
      render(<FileDropzone {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Simulate file input change event directly
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockFileHandlingService.validateFile).toHaveBeenCalledWith(
        mockFile,
        defaultProps.acceptedTypes,
        defaultProps.maxFileSize
      );
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(mockFile);
    });

    it('calls validation service and handles invalid file', async () => {
      const mockFile = createMockFile('test.txt', 'text/plain');
      mockFileHandlingService.validateFile.mockReturnValue({
        isValid: false,
        error: 'File type not supported'
      });
      
      render(<FileDropzone {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Simulate file input change event directly
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockFileHandlingService.validateFile).toHaveBeenCalledWith(
        mockFile,
        defaultProps.acceptedTypes,
        defaultProps.maxFileSize
      );
      expect(defaultProps.onFileSelect).not.toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('shows default state initially', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      expect(dropzone).toHaveClass('border-muted-foreground/25');
      expect(document.querySelector('.lucide-file-image')).toBeInTheDocument();
    });

    it('shows drag over state', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      
      fireEvent.dragEnter(dropzone);
      
      expect(dropzone).toHaveClass('border-primary', 'bg-primary/5');
      expect(screen.getByText('Drop your image here')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      const description = screen.getByText('Drag and drop an image file here, or click to browse');
      
      expect(dropzone).toHaveAttribute('aria-describedby', 'dropzone-description');
      expect(description).toHaveAttribute('id', 'dropzone-description');
    });

    it('has proper tabIndex when enabled', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      expect(dropzone).toHaveAttribute('tabIndex', '0');
    });

    it('has proper tabIndex when disabled', () => {
      render(<FileDropzone {...defaultProps} disabled />);
      
      const dropzone = screen.getByRole('button', { name: 'Upload image file' });
      expect(dropzone).toHaveAttribute('tabIndex', '-1');
    });

    it('has hidden file input with aria-hidden', () => {
      render(<FileDropzone {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute('aria-hidden', 'true');
      expect(fileInput).toHaveClass('hidden');
    });
  });
});