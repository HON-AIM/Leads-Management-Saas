import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[]
  placeholder?: string
}

export function Select({ options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-lg border bg-transparent px-3 py-1.5 text-[13px]',
        'ring-offset-background transition-colors duration-150',
        'placeholder:text-muted-foreground/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/40',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'border-[hsl(var(--input))] text-[hsl(var(--foreground))]',
        'dark:border-white/[0.08] dark:text-white',
        className
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
