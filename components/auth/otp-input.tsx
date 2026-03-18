import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  className
}: OtpInputProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, length);
  }, [length]);

  const focusInput = (index: number) => {
    const input = inputsRef.current[index];
    if (input) {
      input.focus();
      setActiveIndex(index);
    }
  };

  const selectInput = (index: number) => {
    const input = inputsRef.current[index];
    if (input) {
      input.focus();
      input.select();
      setActiveIndex(index);
    }
  };

  const handleInputChange = (index: number, inputValue: string) => {
    if (disabled) return;

    // Only allow digits
    const numericValue = inputValue.replace(/[^0-9]/g, '');
    
    // Handle paste - if multiple characters, distribute across inputs
    if (numericValue.length > 1) {
      const chars = numericValue.split('');
      const newValue = value.split('');
      
      // Fill from current index onwards
      for (let i = 0; i < chars.length && index + i < length; i++) {
        newValue[index + i] = chars[i];
      }
      
      const finalValue = newValue.join('').slice(0, length);
      onChange(finalValue);
      
      // Focus next empty input or last input
      const nextIndex = Math.min(index + chars.length, length - 1);
      setTimeout(() => {
        focusInput(nextIndex);
      }, 0);
      return;
    }

    // Single character input
    const newValue = value.split('');
    newValue[index] = numericValue;
    const finalValue = newValue.join('');
    onChange(finalValue);

    // Move to next input if current is filled
    if (numericValue && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        const newValue = value.split('');
        
        if (newValue[index]) {
          // Clear current input
          newValue[index] = '';
          onChange(newValue.join(''));
        } else if (index > 0) {
          // Move to previous input and clear it
          newValue[index - 1] = '';
          onChange(newValue.join(''));
          focusInput(index - 1);
        }
        break;

      case 'Delete':
        e.preventDefault();
        const deleteValue = value.split('');
        deleteValue[index] = '';
        onChange(deleteValue.join(''));
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          focusInput(index - 1);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (index < length - 1) {
          focusInput(index + 1);
        }
        break;

      case 'Home':
        e.preventDefault();
        focusInput(0);
        break;

      case 'End':
        e.preventDefault();
        focusInput(length - 1);
        break;

      default:
        // Allow digits, Tab, Enter, and clipboard shortcuts (Ctrl/Cmd + A/C/V/X)
        if (
          !/^\d$/.test(e.key) &&
          !['Tab', 'Enter'].includes(e.key) &&
          !(e.ctrlKey || e.metaKey)
        ) {
          e.preventDefault();
        }
        break;
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    selectInput(index);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    // Try to get paste data from clipboard
    const pastedData = e.clipboardData?.getData('text')?.replace(/[^0-9]/g, '') || '';
    
    if (pastedData && pastedData.length > 0) {
      const sliced = pastedData.slice(0, length);
      // Build complete new value starting from index 0
      const newValue = sliced.padEnd(length, '');
      onChange(newValue);
      
      // Focus the last filled input or the last input
      const nextIndex = Math.min(sliced.length, length - 1);
      setTimeout(() => {
        focusInput(nextIndex);
      }, 0);
    }
  };

  // Also handle paste on the wrapper div to catch paste when focused anywhere
  const handleWrapperPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData?.getData('text')?.replace(/[^0-9]/g, '') || '';
    if (pastedData && pastedData.length > 0) {
      const sliced = pastedData.slice(0, length);
      onChange(sliced.padEnd(length, ''));
      const nextIndex = Math.min(sliced.length, length - 1);
      setTimeout(() => focusInput(nextIndex), 0);
    }
  };

  return (
    <div className={cn('flex gap-2 justify-center', className)} onPaste={handleWrapperPaste}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          onPaste={(e) => handlePaste(e)}
          disabled={disabled}
          className={cn(
            'w-12 h-12 text-center text-lg font-semibold border-2 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200',
            activeIndex === index && !disabled
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
              : 'border-gray-300 dark:border-gray-600',
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-white dark:bg-background hover:border-gray-400 dark:hover:border-gray-400 text-foreground',
            value[index]
              ? 'border-green-500 bg-green-50 dark:bg-green-950/40'
              : '',
            'sm:w-14 sm:h-14 sm:text-xl'
          )}
          autoComplete="one-time-code"
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}