import React, { forwardRef, useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value = '', onChange, onBlur, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    const applyMask = (inputValue: string, maskPattern: string): string => {
      const cleanValue = inputValue.replace(/\D/g, '');
      let maskedValue = '';
      let valueIndex = 0;

      for (let i = 0; i < maskPattern.length && valueIndex < cleanValue.length; i++) {
        if (maskPattern[i] === '9') {
          maskedValue += cleanValue[valueIndex];
          valueIndex++;
        } else {
          maskedValue += maskPattern[i];
        }
      }

      return maskedValue;
    };

    const getUnmaskedValue = (maskedValue: string): string => {
      return maskedValue.replace(/\D/g, '');
    };

    useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(applyMask(value, mask));
      }
    }, [value, mask]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      const maskedValue = applyMask(inputValue, mask);
      
      setDisplayValue(maskedValue);
      
      if (onChange) {
        // Create a new event with the masked value
        const newEvent = {
          ...event,
          target: {
            ...event.target,
            value: maskedValue
          }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(newEvent);
      }
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (onBlur) {
        onBlur(event);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

export { MaskedInput };