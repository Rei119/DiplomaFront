'use client';
import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  setUser: (user: User) => void;
  updateUser: (user: User) => void;  // NEW
  setToken: (token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  // Called once on mount by HydrateAuth — restores session for this tab only
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = sessionStorage.getItem('token');
      const userStr = sessionStorage.getItem('user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  login: (user, token) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      console.error('Login failed:', error);
    }
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user', JSON.stringify(user));
    }
    set({ user });
  },

  // NEW: Update user info (merge with existing user data)
  updateUser: (updatedUser) => {
    if (typeof window === 'undefined') return;
    try {
      const currentUser = get().user;
      const mergedUser = { ...currentUser, ...updatedUser };
      sessionStorage.setItem('user', JSON.stringify(mergedUser));
      set({ user: mergedUser });
    } catch (error) {
      console.error('Update user failed:', error);
    }
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('token', token);
    }
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));