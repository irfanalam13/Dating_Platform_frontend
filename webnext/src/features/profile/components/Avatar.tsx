import { getInitials } from '@/shared/lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  isOnline?: boolean
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }

export default function Avatar({ name, size = 'md', isOnline }: AvatarProps) {
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-medium text-indigo-700 dark:text-indigo-300 select-none`}>
        {getInitials(name)}
      </div>
      {isOnline !== undefined && (
        <span className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
      )}
    </div>
  )
}