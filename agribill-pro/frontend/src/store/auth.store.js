import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken = null) =>
        set({ user, token, refreshToken, isAuthenticated: true }),

      updateUser: (user) =>
        set({ user }),

      setToken: (token) =>
        set({ token }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),

      getToken: () => get().token,
    }),
    {
      name: 'agribill-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
