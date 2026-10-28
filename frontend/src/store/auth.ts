import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  user_id: number
  email: string
  full_name: string
  role: 'admin' | 'faculty' | 'student'
  student_id?: number
  faculty_id?: number
}

interface AuthStore {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('access_token', token)
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, token: null })
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)
