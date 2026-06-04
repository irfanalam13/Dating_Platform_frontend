// export interface User {
//   id: number;
//   email: string;
//   username: string; // ✅ add this
//   full_name?: string;
// }

// export interface Tokens {
//   access: string;
//   refresh: string;
// }

// export interface AuthResponse {
//   success: boolean;
//   message: string;
//   data: {
//     user: User;
//     tokens: Tokens;
//   };
// }

// export interface LoginPayload {
//   email: string; // email or phone
//   password: string;
// }

// export interface RegisterPayload {
//   full_name: string;
//   username: string;   // ✅ add this
//   email: string;
//   password: string;
//   confirm_password: string;
// }

// export interface ApiError {
//   message?: string;
//   error?: string;
//   detail?: string;
// }


// export interface LoginResponse {
//   data: {
//     user: User;
//     tokens: Tokens;
//   };
//   message: string;
// }


export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: Tokens;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface GoogleAuthPayload {
  id_token: string;
}

export interface ApiError {
  message?: string;
  error?: string;
  detail?: string;
}

export interface LoginResponse {
  data: {
    user: User;
    tokens: Tokens;
  };
  message: string;
}

// ── New types ──────────────────────────────────────────

export interface RegisterResponse {
  success: boolean;
  message: string;
  code: string;
  data: {
    user: User;
    verify_token: string;
  };
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  code: string;
  data: {
    user: User;
    tokens: Tokens;
  };
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
}

export interface ResendVerificationPayload {
  email: string;
}
