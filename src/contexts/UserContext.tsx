import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole, currentUser } from '@/lib/mockData';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface UserContextType {
  user: User;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // keep a sensible default user for the demo, but expose login/logout
  const [user, setUser] = useState<User>(currentUser);
  // Start unauthenticated by default — routes will redirect to /login until login() is called
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // Add loading state to prevent premature redirects during auth restoration
  const [loading, setLoading] = useState<boolean>(true);

  // Use Firebase Auth for login
  const login = async (email: string, password: string): Promise<void> => {
    // Uses Firebase signInWithEmailAndPassword
    // We await the credential but do not return it so the function matches the declared Promise<void> signature
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged listener (below) will update the user and isAuthenticated state
    return;
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser({ ...currentUser, name: 'Guest', email: '', id: '0' });
    setIsAuthenticated(false);
  };

  // Listen to Firebase auth state and populate our User object.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setIsAuthenticated(false);
        setUser({ ...currentUser, name: 'Guest', email: '', id: '0' });
        setLoading(false);
        return;
      }

      // Try to fetch user metadata (role) from Firestore: collection `users/{uid}` expected to have `{ role: 'patient'|'therapist', name?, avatar? }`
      try {
        const userDoc = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userDoc);
        let role: UserRole = 'patient';
        let name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
        let avatar = fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

        if (snap.exists()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = snap.data() as any;
          if (data?.role === 'therapist' || data?.role === 'patient') role = data.role;
          if (data?.name) name = data.name;
          if (data?.avatar) avatar = data.avatar;
        } else {
          // fallback: infer role from email until a Firestore user profile is created
          if (fbUser.email && fbUser.email.toLowerCase().includes('therapist')) role = 'therapist';
        }

        const newUser: User = {
          id: fbUser.uid,
          name,
          email: fbUser.email || '',
          role,
          avatar,
        };

        setUser(newUser);
        setIsAuthenticated(true);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user profile from Firestore', err);
        // fallback behavior
        setUser({ ...currentUser, name: fbUser.displayName || fbUser.email || 'User', email: fbUser.email || '', id: fbUser.uid });
        setIsAuthenticated(true);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const setUserRole = (role: UserRole) => {
    setUser({ ...user, role });
  };

  return (
    <UserContext.Provider value={{ user, isAuthenticated, loading, login, logout, setUserRole }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
