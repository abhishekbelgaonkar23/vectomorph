import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { LoadingIndicator } from '../LoadingIndicator'

// Mock the Progress component since it uses Radix UI
vi.mock('~/components/ui/progress', () => ({
  Progress: ({ value, className, ...props }: any) => (
    <div 
      data-testid="progress-bar" 
      data-value={value}
      className={className}
      {...props}
    />
  )
}))

// Mock the Card components
vi.mock('~/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div data-testid="card-content" className={className} {...props}>
      {children}
    </div>
  )
}))

describe('LoadingIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility States', () => {
    it('should not render when isVisible is false', () => {
      render(<LoadingIndicator isVisible={false} />)
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.queryByTestId('card')).not.toBeInTheDocument()
    })

    it('should render when isVisible is true', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })

    it('should show and hide based on isVisible prop changes', () => {
      const { rerender } = render(<LoadingIndicator isVisible={false} />)
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      
      rerender(<LoadingIndicator isVisible={true} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      
      rerender(<LoadingIndicator isVisible={false} />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('Message Display', () => {
    it('should display default message when no message prop is provided', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      expect(screen.getByText('Processing image...')).toBeInTheDocument()
    })

    it('should display custom message when message prop is provided', () => {
      const customMessage = 'Converting to SVG...'
      render(<LoadingIndicator isVisible={true} message={customMessage} />)
      
      expect(screen.getByText(customMessage)).toBeInTheDocument()
      expect(screen.queryByText('Processing image...')).not.toBeInTheDocument()
    })

    it('should display empty message when empty string is provided', () => {
      render(<LoadingIndicator isVisible={true} message="" />)
      
      expect(screen.queryByText('Processing image...')).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveAttribute('aria-live', 'polite')
      expect(statusElement).toHaveAttribute('aria-label', 'Loading indicator')
    })

    it('should have progress bar with proper aria-label', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('aria-label', 'Processing progress')
    })

    it('should have message with aria-live attribute', () => {
      render(<LoadingIndicator isVisible={true} message="Custom message" />)
      
      const messageElement = screen.getByText('Custom message')
      expect(messageElement).toHaveAttribute('aria-live', 'polite')
      expect(messageElement).toHaveAttribute('id', 'loading-message')
    })

    it('should hide spinner from screen readers', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const spinner = screen.getByRole('status').querySelector('.animate-spin')
      expect(spinner).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Animation and Styling', () => {
    it('should apply correct CSS classes for animations', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('animate-in', 'fade-in-0', 'duration-200')
    })

    it('should have spinner with animation classes', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const spinner = screen.getByRole('status').querySelector('.animate-spin')
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-b-2', 'border-primary')
    })

    it('should apply responsive classes to card', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('w-full', 'max-w-md', 'mx-auto')
    })
  })

  describe('Progress Animation', () => {
    it('should initialize progress bar with zero value', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '0')
    })

    it('should reset progress when becoming invisible and visible again', () => {
      const { rerender } = render(<LoadingIndicator isVisible={true} />)
      
      // Hide the component
      rerender(<LoadingIndicator isVisible={false} />)
      
      // Show it again - progress should reset to 0
      rerender(<LoadingIndicator isVisible={true} />)
      
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '0')
    })

    it('should have interval cleanup on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      const { unmount } = render(<LoadingIndicator isVisible={true} />)
      
      unmount()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
      
      clearIntervalSpy.mockRestore()
    })
  })

  describe('Component Structure', () => {
    it('should render all required elements when visible', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByTestId('card-content')).toBeInTheDocument()
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
      expect(screen.getByText('Processing image...')).toBeInTheDocument()
    })

    it('should have proper component hierarchy', () => {
      render(<LoadingIndicator isVisible={true} />)
      
      const card = screen.getByTestId('card')
      const cardContent = screen.getByTestId('card-content')
      const progressBar = screen.getByTestId('progress-bar')
      
      expect(card).toContainElement(cardContent)
      expect(cardContent).toContainElement(progressBar)
    })
  })
})