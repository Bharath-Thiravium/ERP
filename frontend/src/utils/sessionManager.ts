/**
 * Session Manager Utility
 * Handles session key persistence and restoration across navigation
 */

export class SessionManager {
  private static readonly SESSION_KEY = 'service_session_key'
  private static readonly STORE_KEY = 'service-user-storage'

  /**
   * Ensure session key is available in sessionStorage
   * This prevents logout during navigation
   */
  static ensureSessionKey(): string | null {
    // First check sessionStorage
    let sessionKey = sessionStorage.getItem(this.SESSION_KEY)
    
    if (!sessionKey) {
      // Try to restore from localStorage store
      try {
        const storeData = localStorage.getItem(this.STORE_KEY)
        if (storeData) {
          const parsed = JSON.parse(storeData)
          sessionKey = parsed?.state?.sessionKey
          
          if (sessionKey) {
            // Restore to sessionStorage
            sessionStorage.setItem(this.SESSION_KEY, sessionKey)
            console.log('🔧 Session key restored from store during navigation')
          }
        }
      } catch (error) {
        console.warn('Failed to restore session key from store:', error)
      }
    }
    
    return sessionKey
  }

  /**
   * Preserve session key before navigation
   */
  static preserveSession(): void {
    const sessionKey = this.ensureSessionKey()
    if (sessionKey) {
      // Double-ensure it's in sessionStorage
      sessionStorage.setItem(this.SESSION_KEY, sessionKey)
    }
  }

  /**
   * Check if session is valid without triggering logout
   */
  static isSessionValid(): boolean {
    const sessionKey = this.ensureSessionKey()
    return !!sessionKey
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_KEY)
    localStorage.removeItem(this.STORE_KEY)
  }
}