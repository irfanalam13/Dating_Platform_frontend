// utils/wsToken.ts
import api, { getAccessToken, setAccessToken } from '@/shared/api/client'

export const getFreshToken = async (): Promise<string | null> => {
  let token = getAccessToken()

  try {
    const refreshRes = await api.post('/auth/refresh/')
    const newToken = refreshRes?.data?.data?.access || null
    if (newToken) {
      setAccessToken(newToken)
      token = newToken
    }
  } catch (e) {
    console.warn('Could not refresh token before WS connect')
  }

  return token
}