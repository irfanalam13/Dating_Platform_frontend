interface Props { isOnline: boolean; lastSeen: string | null }

import { formatLastSeen } from '@/shared/lib/utils'

export default function OnlineIndicator({ isOnline, lastSeen }: Props) {
  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      {isOnline ? (
        <span className="text-green-500 font-medium">Online</span>
      ) : (
        `Last seen ${formatLastSeen(lastSeen)}`
      )}
    </span>
  )
}