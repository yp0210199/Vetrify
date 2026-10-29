import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User as FirebaseUser,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase/config';
import { AuthUser, SignInCredentials, SignUpCredentials } from './types';

/**
 * Normalizes Firebase User object into Vetrify AuthUser identity model
 * Note: Does not invent fake pharmacyId, storeId or roles (handled in future phases)
 */
export function normalizeFirebaseUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;

  // Derive human-readable initials from displayName or email prefix
  let initials = 'U';
  if (user.displayName && user.displayName.trim().length > 0) {
    const parts = user.displayName.trim().split(' ');
    initials = parts.length > 1 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  } else if (user.email) {
    initials = user.email.slice(0, 2).toUpperCase();
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Staff Member'),
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    initials,
  };
}

/**
 * Maps raw Firebase authentication error codes to secure, user-friendly messages
 */
export function mapAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Unable to complete the authentication request right now. Please try again.';
  }

  const err = error as { code?: string; message?: string };
  const code = err.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'The email address entered is not valid. Please check and try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Unable to sign you in. Please check your email and password and try again.';
    case 'auth/user-disabled':
      return 'This staff account has been disabled. Please contact your workspace administrator.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to multiple failed sign-in attempts. Please try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connection unavailable. Please check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password authentication is currently disabled in your Firebase console.';
    case 'auth/requires-recent-login':
      return 'Your session has expired. Please sign in again to continue.';
    case 'auth/expired-action-code':
      return 'The password reset link has expired. Please request a new link.';
    case 'auth/invalid-action-code':
      return 'The password reset link is invalid or has already been used.';
    default:
      return 'Unable to authenticate with the provided details. Please try again.';
  }
}

/**
 * Core Authentication Service Layer
 */
export const authService = {
  /**
   * Authenticate staff member using Email and Password
   */
  async signIn({ email, password, rememberMe = true }: SignInCredentials): Promise<AuthUser> {
    const auth = getFirebaseAuth();
    
    // Configure session persistence based on rememberMe selection
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
    } catch {
      // Fallback to default persistence if browser policy restricts
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const normalized = normalizeFirebaseUser(userCredential.user);
      if (!normalized) {
        throw new Error('Authentication succeeded but user identity could not be resolved.');
      }
      return normalized;
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  },

  /**
   * Register new owner account using Email and Password
   */
  async signUp({ email, password, displayName }: SignUpCredentials): Promise<AuthUser> {
    const auth = getFirebaseAuth();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName && displayName.trim()) {
        try {
          await updateProfile(userCredential.user, { displayName: displayName.trim() });
        } catch {
          // Profile display name update warning (non-fatal)
        }
      }
      const normalized = normalizeFirebaseUser(userCredential.user);
      if (!normalized) {
        throw new Error('Account created but user identity could not be resolved.');
      }
      return normalized;
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  },

  /**
   * Secure Sign Out
   */
  async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  },

  /**
   * Dispatch password reset link to registered email
   */
  async sendPasswordReset(email: string): Promise<void> {
    const auth = getFirebaseAuth();
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      // For security, if user is not found, we don't leak account existence
      const err = error as { code?: string };
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        return; // Return silently so user gets standard confirmation
      }
      throw new Error(mapAuthError(error));
    }
  },

  /**
   * Subscribe to Firebase authentication state changes
   */
  observeAuthState(onChange: (user: AuthUser | null) => void): Unsubscribe {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(
      auth,
      (user) => {
        onChange(normalizeFirebaseUser(user));
      },
      (error) => {
        console.error('Firebase Auth State Observer Error:', error);
        onChange(null);
      }
    );
  },

  /**
   * Get current authenticated user synchronously if available
   */
  getCurrentUser(): AuthUser | null {
    const auth = getFirebaseAuth();
    return normalizeFirebaseUser(auth.currentUser);
  },

  /**
   * Update profile display name and/or photo URL
   */
  async updateUserProfile(params: { displayName?: string; photoURL?: string }): Promise<AuthUser> {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) throw new Error('No authenticated user session found.');

    await updateProfile(auth.currentUser, {
      displayName: params.displayName !== undefined ? params.displayName.trim() : auth.currentUser.displayName,
      photoURL: params.photoURL !== undefined ? params.photoURL : auth.currentUser.photoURL,
    });

    const normalized = normalizeFirebaseUser(auth.currentUser);
    if (!normalized) throw new Error('User profile updated but user identity could not be resolved.');
    return normalized;
  },

  /**
   * Update password for currently authenticated user
   */
  async updateUserPassword(newPassword: string): Promise<void> {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) throw new Error('No authenticated user session found.');

    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  },
};
