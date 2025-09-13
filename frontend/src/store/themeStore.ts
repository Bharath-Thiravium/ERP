import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Theme } from '../types'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      
      toggleTheme: () => {
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        }))
      },
      
      setTheme: (theme: Theme) => {
        set({ theme })
      },
    }),
    {
      name: 'theme-storage',
    }
  )
)
