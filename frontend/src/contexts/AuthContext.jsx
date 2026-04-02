import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const mapAuthError = (err) => {
    const code = err?.code || '';
    const messageByCode = {
      'auth/popup-closed-by-user': 'Google login popup was closed before completion.',
      'auth/popup-blocked': 'Popup was blocked by browser. Continuing with redirect login...',
      'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.',
      'auth/network-request-failed': 'Network or browser privacy settings blocked Google sign-in.',
      'auth/invalid-api-key': 'Firebase API key is invalid or missing. Check frontend .env settings.',
      'auth/operation-not-allowed': 'Google provider is not enabled in Firebase Authentication.',
    };
    return messageByCode[code] || err?.message || 'Authentication failed.';
  };

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      // Keep app alive and surface meaningful logs for debugging.
      console.error('Google redirect result failed:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      return { redirect: false, result };
    } catch (err) {
      const fallbackCodes = new Set([
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
      ]);

      if (fallbackCodes.has(err?.code)) {
        await signInWithRedirect(auth, provider);
        return { redirect: true };
      }

      throw new Error(mapAuthError(err));
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
