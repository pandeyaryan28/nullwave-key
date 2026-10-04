import React, { useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface CodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  isLoading?: boolean;
  error?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const CodeInput: React.FC<CodeInputProps> = ({
  length = 6,
  onComplete,
  onChange,
  isLoading = false,
  error = null,
  autoFocus = false,
  disabled = false,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const triggerCompleteIfFull = (newDigits: string[]) => {
    const fullCode = newDigits.join('');
    if (onChange) onChange(fullCode);
    if (fullCode.length === length && /^\d+$/.test(fullCode)) {
      onComplete(fullCode);
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Extract only digits
    const numericChar = val.replace(/\D/g, '');

    if (!numericChar) {
      // Deleted / cleared
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      if (onChange) onChange(newDigits.join(''));
      return;
    }

    // If multiple digits were typed (e.g. autofill or paste)
    if (numericChar.length > 1) {
      handlePastedString(numericChar);
      return;
    }

    // Single digit entry
    const char = numericChar[numericChar.length - 1];
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance to next slot
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    triggerCompleteIfFull(newDigits);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back to previous slot and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        if (onChange) onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
        if (onChange) onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedString = (pasted: string) => {
    const numericOnly = pasted.replace(/\D/g, '').slice(0, length);
    if (!numericOnly) return;

    const newDigits = [...digits];
    for (let i = 0; i < length; i++) {
      newDigits[i] = numericOnly[i] || '';
    }
    setDigits(newDigits);

    // Focus slot after last entered digit
    const nextIndex = Math.min(numericOnly.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    triggerCompleteIfFull(newDigits);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handlePastedString(pasted);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div
        className="flex items-center justify-center gap-2 sm:gap-3"
        onPaste={handlePaste}
      >
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={el => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index]}
            disabled={disabled || isLoading}
            onFocus={e => e.target.select()}
            onChange={e => handleChange(index, e)}
            onKeyDown={e => handleKeyDown(index, e)}
            aria-label={`Digit ${index + 1} of ${length}`}
            className={clsx(
              'w-11 h-14 sm:w-13 sm:h-16 text-center font-mono text-2xl font-bold rounded-md border transition-all select-none',
              'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-neutral-900 dark:focus:border-neutral-100',
              error
                ? 'border-red-500 text-red-600 dark:text-red-400 focus:ring-red-500 focus:border-red-500'
                : digits[index]
                ? 'border-neutral-700 dark:border-neutral-300'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600',
              (disabled || isLoading) && 'opacity-60 cursor-not-allowed'
            )}
          />
        ))}
      </div>

      {isLoading && (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 animate-pulse">
          Verifying access code...
        </p>
      )}

      {error && !isLoading && (
        <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
