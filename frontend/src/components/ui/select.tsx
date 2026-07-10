interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[]
  placeholder?: string
}

export function Select({ options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <select
      className={`flex h-9 w-full rounded-md border border-sky-200 bg-sky-50/80 px-3 py-1 text-sm text-sky-900 shadow-sm transition-colors placeholder:text-sky-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400 ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
