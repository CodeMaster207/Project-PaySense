'use client'

import { TAG_COLORS, TAG_COLOR_KEYS, type TagColor } from '@/lib/tagColors'

export function TagBadge({ tag, color }: { tag: string; color: TagColor }) {
  if (!tag) return null
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TAG_COLORS[color].badge}`}>{tag}</span>
}

export function TagColorPicker({ value, onChange }: { value: TagColor; onChange: (c: TagColor) => void }) {
  return (
    <div role="radiogroup" aria-label="Tag color" className="flex items-center gap-2">
      {TAG_COLOR_KEYS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={TAG_COLORS[c].label}
          title={TAG_COLORS[c].label}
          onClick={() => onChange(c)}
          className={`size-7 rounded-full border-2 transition ${TAG_COLORS[c].swatch} ${value === c ? 'border-peel-900 ring-2 ring-banana-300 ring-offset-1' : 'border-white hover:scale-110'}`}
        />
      ))}
    </div>
  )
}
