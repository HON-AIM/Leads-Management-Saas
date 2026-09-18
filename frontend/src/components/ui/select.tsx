import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectProps {
  options: { label: string; value: string }[]
  placeholder?: string
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  className?: string
  disabled?: boolean
}

export function Select({ options, placeholder, value, onChange, className = '', disabled }: SelectProps) {
  const items = options.filter((opt) => opt.value !== '' && opt.value != null)
  const selected = items.find((opt) => opt.value === value)
  const current = selected?.label ?? placeholder ?? ''

  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={(val) => onChange?.({ target: { value: val } })}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-[13px]',
          'ring-offset-background transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/40',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'border-[hsl(var(--input))] text-[hsl(var(--foreground))]',
          'dark:border-white/[0.08] dark:text-white dark:bg-transparent',
          'data-[placeholder]:text-muted-foreground/60',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={current}>
          {current}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={14} className="shrink-0 opacity-60" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="start"
          sideOffset={4}
          className={cn(
            'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border p-1 shadow-elevated',
            'bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))]',
            'dark:border-white/[0.08] dark:bg-[#0e1428] dark:text-white',
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'max-h-[min(20rem,var(--radix-select-content-available-height))]'
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {items.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2.5 text-[13px] outline-none transition-colors',
                  'focus:bg-white/[0.06] dark:focus:bg-white/[0.06]',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40'
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check size={13} />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
