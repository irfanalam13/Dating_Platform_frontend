// export { useCurrentUser } from "./hooks/useCurrentUser";
// export { useCurrentUser as useAuth } from "./hooks/useCurrentUser";
// export { useLogin, useRegister, useLogout } from "./hooks/useAuth";
// export { useAuthStore } from "./store/auth.store";

export { useCurrentUser } from "./hooks/useCurrentUser";
export { useCurrentUser as useAuth } from "./hooks/useCurrentUser";
export { 
  useLogin, 
  useRegister, 
  useGoogleAuth,
  useLogout,
  useVerifyEmail,
  useResendVerification,
  useForgotPassword,
  useResetPassword,
} from "./hooks/useAuth";
export { useAuthStore } from "./store/auth.store";
