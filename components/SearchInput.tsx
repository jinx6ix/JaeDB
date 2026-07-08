'use client';
import { forwardRef } from 'react';

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  /** Show a small ✕ button when value is non-empty. Default true. */
  clearable?: boolean;
  /** Width class for the wrapper. Default `max-w-sm`. */
  widthClass?: string;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      clearable = true,
      widthClass = 'max-w-sm',
      placeholder = 'Search…',
      disabled,
      className = 'input',
      ...rest
    },
    ref,
  ) => {
    return (
      <div className={`relative ${widthClass}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
          🔍
        </span>
        <input
          ref={ref}
          type="search"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} pl-9 ${clearable && value ? 'pr-9' : ''}`}
          // Prevent the native clear (×) — we render our own for consistency.
          // Most browsers only show this on type=search; suppress via style.
          style={{ ...(rest.style || {}) }}
          {...rest}
        />
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100"
          >
            ×
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
export default SearchInput;
