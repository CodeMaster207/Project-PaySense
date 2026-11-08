/** Subtitle shown under every table that is built with AG Grid. */
export function GridCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="no-print mt-2 text-xs text-peel-500">
      <b className="font-bold text-peel-700">Table by AG Grid.</b> {children}
    </p>
  )
}
