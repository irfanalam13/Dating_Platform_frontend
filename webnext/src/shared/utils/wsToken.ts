// // shared/utils/wsToken.ts
// import api, { getAccessToken, setAccessToken, refreshOnce } from '@/shared/api/client'

// export const getFreshToken = async (): Promise<string | null> => {
//   let token = getAccessToken()

//   try {
//     const refreshRes = await api.post('/auth/refresh/')

//     // ✅ Fix — your API returns { success, code, data: { access } }
//     const newToken = refreshRes?.data?.data?.access    // ✅ already correct
//                   ?? refreshRes?.data?.access          // ✅ fallback
//                   ?? null

//     if (newToken) {
//       setAccessToken(newToken)
//       token = newToken
//     } else {
//       console.warn('⚠️ Refresh returned no token:', refreshRes?.data)
//     }
//   } catch (e) {
//     console.warn('Could not refresh token before WS connect')
//   }

//   return token
// }



// shared/utils/wsToken.ts
import { getAccessToken, refreshOnce } from '@/shared/api/client'

export const getFreshToken = async (): Promise<string | null> => {
  const token = await refreshOnce()        // ✅ single shared refresh
  return token ?? getAccessToken()         // ✅ fallback to existing token
}