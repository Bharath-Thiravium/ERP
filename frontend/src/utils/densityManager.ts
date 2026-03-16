export type DensityMode = 'compact' | 'normal'

export const densityManager = {
  get(): DensityMode {
    try {
      return (localStorage.getItem('app_density') as DensityMode) || 'compact'
    } catch {
      return 'compact'
    }
  },

  set(density: DensityMode): void {
    try {
      localStorage.setItem('app_density', density)
      document.documentElement.setAttribute('data-density', density)
    } catch (e) {
      console.warn('Failed to set density:', e)
    }
  },

  toggle(): DensityMode {
    const current = this.get()
    const next = current === 'compact' ? 'normal' : 'compact'
    this.set(next)
    return next
  }
}