'use client'

import type { ImageLoaderProps } from 'next/image'

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Add sizing params to Payload's local upload URLs (/api/<collection>/file/...)
  // so we don't serve full-resolution images everywhere.
  // External URLs are passed through unchanged.
  if (src.startsWith('/')) {
    const params = new URLSearchParams({ w: String(width) })
    if (quality) params.set('q', String(quality))
    return `${src}?${params.toString()}`
  }
  return src
}
