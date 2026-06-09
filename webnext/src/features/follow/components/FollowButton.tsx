'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, UserCheck, Clock } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { followUser, unfollowUser, getFollowing } from '@/shared/api/follow.api'
import { showError } from '@/shared/utils/toast'

interface Props {
  /** The user id to follow (NOT the profile id). */
  userId: number
  className?: string
}

export default function FollowButton({ userId, className = '' }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const myId = Number(user?.id)

  // Determine current follow state from my following list.
  const { data: following } = useQuery({
    queryKey: ['my-following', myId],
    queryFn: () => getFollowing(myId),
    enabled: !!myId,
    staleTime: 60_000,
  })

  const isFollowing = useMemo(
    () => !!following?.results?.some((u) => u.user_id === userId),
    [following, userId]
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-following', myId] })
    queryClient.invalidateQueries({ queryKey: ['followers'] })
    queryClient.invalidateQueries({ queryKey: ['following'] })
  }

  const followM = useMutation({
    mutationFn: () => followUser(userId),
    onSuccess: invalidate,
    onError: (e) => showError(e, 'Could not follow.'),
  })

  const unfollowM = useMutation({
    mutationFn: () => unfollowUser(userId),
    onSuccess: invalidate,
    onError: (e) => showError(e, 'Could not unfollow.'),
  })

  const pending = followM.isPending || unfollowM.isPending
  const isPendingRequest = followM.data?.pending

  if (myId === userId) return null

  return (
    <button
      onClick={() => (isFollowing ? unfollowM.mutate() : followM.mutate())}
      disabled={pending}
      className={`glass-btn flex h-11 items-center justify-center gap-2 rounded-3xl px-5 text-sm font-semibold disabled:opacity-50 ${className}`}
    >
      {isPendingRequest ? (
        <><Clock className="h-4 w-4" /> Requested</>
      ) : isFollowing ? (
        <><UserCheck className="h-4 w-4" /> Following</>
      ) : (
        <><UserPlus className="h-4 w-4" /> Follow</>
      )}
    </button>
  )
}
