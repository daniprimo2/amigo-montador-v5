import React, { useState } from 'react';
import { Input, InputProps } from './input';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showCounter?: boolean;
  maxLength?: number;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showCounter = false, maxLength = 26, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [inputValue, setInputValue] = useState(props.value as string || '');

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (maxLength && value.length <= maxLength) {
        setInputValue(value);
        props.onChange?.(e);
      } else if (!maxLength) {
        setInputValue(value);
        props.onChange?.(e);
      }
    };

    return (
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
          value={inputValue}
          maxLength={maxLength}
          onChange={handleChange}
          {...props}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          onClick={togglePasswordVisibility}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        {showCounter && (
          <div className="text-xs text-gray-400 text-right mt-1">
            {inputValue.length}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';