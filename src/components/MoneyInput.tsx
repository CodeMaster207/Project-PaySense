import type { InputHTMLAttributes } from 'react'
import { currencySymbol } from '@/lib/money'

/** Number input with a fixed "RM" prefix inside the field. */
export function MoneyInput({ className = '', inputClassName = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { inputClassName?: string }) {
  return (
    <span className={`relative block ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-peel-500">{currencySymbol()}</span>
      <input type="number" inputMode="decimal" {...props} className={`w-full ${currencySymbol().length > 2 ? '!pl-12' : '!pl-10'} ${inputClassName}`} />
    </span>
  )
}
