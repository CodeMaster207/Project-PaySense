// Tag colors drawn from the PaySense banana theme. Class names are literal so Tailwind keeps them.
export const TAG_COLORS = {
  banana: { label: 'Banana', badge: 'bg-banana-300 text-peel-900', swatch: 'bg-banana-300' },
  honey: { label: 'Honey', badge: 'bg-banana-500 text-peel-900', swatch: 'bg-banana-500' },
  leaf: { label: 'Leaf', badge: 'bg-leaf-500 text-white', swatch: 'bg-leaf-500' },
  berry: { label: 'Berry', badge: 'bg-berry-500 text-white', swatch: 'bg-berry-500' },
  peel: { label: 'Peel', badge: 'bg-peel-700 text-banana-100', swatch: 'bg-peel-700' },
} as const

export type TagColor = keyof typeof TAG_COLORS
export const TAG_COLOR_KEYS = Object.keys(TAG_COLORS) as TagColor[]
export const asTagColor = (v: unknown): TagColor => (TAG_COLOR_KEYS.includes(v as TagColor) ? (v as TagColor) : 'banana')
