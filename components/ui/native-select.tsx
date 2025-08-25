'use client';

import { ChevronDownIcon } from 'lucide-react';
import { forwardRef } from 'react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

interface NativeSelectProps extends React.ComponentProps<'select'> {
  placeholder?: string;
}

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 appearance-none pr-8',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
      </div>
    );
  }
);

NativeSelect.displayName = 'NativeSelect';

interface NativeSelectOptionProps extends React.ComponentProps<'option'> {}

const NativeSelectOption = forwardRef<HTMLOptionElement, NativeSelectOptionProps>(
  ({ className, ...props }, ref) => {
    return <option ref={ref} className={cn('py-1.5 px-2 text-sm', className)} {...props} />;
  }
);

NativeSelectOption.displayName = 'NativeSelectOption';

export { NativeSelect, NativeSelectOption };
