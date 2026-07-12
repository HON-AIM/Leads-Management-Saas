import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border bg-transparent px-3 py-1.5 text-[13px]',
          'ring-offset-background transition-colors duration-150',
          'file:border-0 file:bg-transparent file:text-[13px] file:font-medium',
          'placeholder:text-muted-foreground/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/40',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'border-[hsl(var(--input))] text-[hsl(var(--foreground))]',
          'dark:border-white/[0.10] dark:text-white',
          'dark:focus-visible:ring-blue-500/20 dark:focus-visible:border-blue-500/30',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
