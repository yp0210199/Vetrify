export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  initials: string;
  // Architectural placeholder for future Phase multi-store/RBAC models (not populated with fake data)
  role?: string;
  storeId?: string;
  pharmacyId?: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface PasswordResetPayload {
  email: string;
}
