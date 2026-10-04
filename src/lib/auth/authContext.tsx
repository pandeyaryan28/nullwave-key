import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateCreatorProfile: (data: Partial<UserProfile>) => Promise<void>;
  claimUsername: (username: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local fallback user storage key for development resilience
const LOCAL_USER_KEY = 'unlockr_local_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user profile from Firestore or local fallback
  const fetchProfile = async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setProfile(userSnap.data() as UserProfile);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch profile from Firestore, checking local storage:', err);
    }

    // Check local fallback
    try {
      const local = localStorage.getItem(`unlockr_profile_${uid}`);
      if (local) {
        setProfile(JSON.parse(local));
      }
    } catch {}
  };

  useEffect(() => {
    // Check if local guest session exists first
    const storedLocalUser = localStorage.getItem(LOCAL_USER_KEY);
    if (storedLocalUser) {
      try {
        const parsed = JSON.parse(storedLocalUser);
        setUser(parsed as unknown as User);
        fetchProfile(parsed.uid).finally(() => setLoading(false));
      } catch {
        // Continue to Firebase Auth
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser.uid);
      } else if (!storedLocalUser) {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await fetchProfile(cred.user.uid);
    } catch (error: unknown) {
      const authErr = error as { code?: string; message?: string };
      console.warn('Google sign-in failed via Firebase Auth:', authErr);
      // Fallback local sign in for testing resilience
      if (authErr.code?.includes('configuration-not-found') || authErr.code?.includes('operation-not-allowed')) {
        const mockUid = 'creator_google_demo';
        const mockUser = {
          uid: mockUid,
          email: 'creator@example.com',
          displayName: 'Demo Creator',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
        setUser(mockUser as unknown as User);
        await fetchProfile(mockUid);
        return;
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await fetchProfile(cred.user.uid);
    } catch (error: unknown) {
      const authErr = error as { code?: string; message?: string };
      console.warn('Email sign-in failed via Firebase Auth:', authErr);
      if (authErr.code?.includes('configuration-not-found') || authErr.code?.includes('operation-not-allowed')) {
        const mockUid = 'creator_' + btoa(email).substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
        const mockUser = {
          uid: mockUid,
          email,
          displayName: email.split('@')[0],
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
        setUser(mockUser as unknown as User);
        await fetchProfile(mockUid);
        return;
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email,
        displayName: displayName || email.split('@')[0],
        username: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setProfile(newProfile);
    } catch (error: unknown) {
      const authErr = error as { code?: string; message?: string };
      console.warn('Email signup failed via Firebase Auth:', authErr);
      if (authErr.code?.includes('configuration-not-found') || authErr.code?.includes('operation-not-allowed')) {
        const mockUid = 'creator_' + btoa(email).substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
        const mockUser = {
          uid: mockUid,
          email,
          displayName: displayName || email.split('@')[0],
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
        setUser(mockUser as unknown as User);

        const newProfile: UserProfile = {
          uid: mockUid,
          email,
          displayName: displayName || email.split('@')[0],
          username: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        try {
          await setDoc(doc(db, 'users', mockUid), newProfile);
        } catch {}
        localStorage.setItem(`unlockr_profile_${mockUid}`, JSON.stringify(newProfile));
        setProfile(newProfile);
        return;
      }
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_USER_KEY);
    await firebaseSignOut(auth).catch(() => {});
    setUser(null);
    setProfile(null);
  };

  const claimUsername = async (rawUsername: string, displayName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User is not signed in.' };

    const username = rawUsername.toLowerCase().trim();
    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(username)) {
      return {
        success: false,
        error: 'Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores.',
      };
    }

    try {
      // Transaction to atomically claim username
      await runTransaction(db, async transaction => {
        const usernameRef = doc(db, 'usernames', username);
        const usernameDoc = await transaction.get(usernameRef);

        if (usernameDoc.exists() && usernameDoc.data().uid !== user.uid) {
          throw new Error('USERNAME_TAKEN');
        }

        const now = Date.now();
        // Claim username
        transaction.set(usernameRef, { uid: user.uid, createdAt: now });

        // Update user profile
        const userRef = doc(db, 'users', user.uid);
        const updatedData: Partial<UserProfile> = {
          username,
          displayName: displayName || profile?.displayName || user.displayName || username,
          updatedAt: now,
        };
        transaction.set(userRef, updatedData, { merge: true });
      });

      // Update state
      const updatedProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: displayName || profile?.displayName || user.displayName || username,
        username,
        bio: profile?.bio || '',
        socialLink: profile?.socialLink || '',
        photoURL: profile?.photoURL || user.photoURL || undefined,
        createdAt: profile?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      setProfile(updatedProfile);
      localStorage.setItem(`unlockr_profile_${user.uid}`, JSON.stringify(updatedProfile));

      return { success: true };
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message === 'USERNAME_TAKEN') {
        return { success: false, error: 'This username is already taken. Please choose another.' };
      }
      return { success: false, error: e.message || 'Failed to claim username.' };
    }
  };

  const updateCreatorProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated.');
    const now = Date.now();
    const cleanData = { ...data, updatedAt: now };

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, cleanData);
    } catch {
      // Fallback
    }

    setProfile(prev => {
      const merged = prev ? { ...prev, ...cleanData } : (cleanData as UserProfile);
      localStorage.setItem(`unlockr_profile_${user.uid}`, JSON.stringify(merged));
      return merged;
    });
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateCreatorProfile,
        claimUsername,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
