"use client";

import { useState } from 'react'
import { getInitials } from '@/shared/lib/utils'

interface AvatarProps {
  name: string
  /** Avatar image URL. When missing/blank/broken, the initials are shown. */
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  isOnline?: boolean
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }

function isRealImage(src?: string | null): boolean {
  if (!src) return false
  const t = src.trim()
  return t !== '' && t !== '/default.png'
}

export default function Avatar({ name, src, size = 'md', isOnline }: AvatarProps) {
  const [broken, setBroken] = useState(false)

  // Reset the broken flag when the src changes (e.g. a fresh upload).
  const [prevSrc, setPrevSrc] = useState(src)
  if (src !== prevSrc) {
    setPrevSrc(src)
    setBroken(false)
  }

  const showImage = isRealImage(src) && !broken

  return (
    <div className="relative flex-shrink-0">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          onError={() => setBroken(true)}
          className={`${sizes[size]} rounded-full object-cover select-none`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-medium text-indigo-700 dark:text-indigo-300 select-none`}>
          {getInitials(name)}
        </div>
      )}
      {isOnline !== undefined && (
        <span className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
      )}
    </div>
  )
}
