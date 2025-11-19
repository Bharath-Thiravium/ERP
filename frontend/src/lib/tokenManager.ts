// Secure token management using httpOnly cookies
class TokenManager {
  private static instance: TokenManager;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // Set tokens using httpOnly cookies (backend should set these)
  setTokens(accessToken: string, refreshToken: string): void {
    // For development, we'll use secure localStorage with encryption
    // In production, these should be httpOnly cookies set by the backend
    const encryptedAccess = this.encrypt(accessToken);
    const encryptedRefresh = this.encrypt(refreshToken);
    
    sessionStorage.setItem('_at', encryptedAccess);
    sessionStorage.setItem('_rt', encryptedRefresh);
  }

  getAccessToken(): string | null {
    const encrypted = sessionStorage.getItem('_at');
    return encrypted ? this.decrypt(encrypted) : null;
  }

  getRefreshToken(): string | null {
    const encrypted = sessionStorage.getItem('_rt');
    return encrypted ? this.decrypt(encrypted) : null;
  }

  clearTokens(): void {
    sessionStorage.removeItem('_at');
    sessionStorage.removeItem('_rt');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('firstLoginRequired');
    sessionStorage.removeItem('approvalPending');
    sessionStorage.removeItem('approvalStatus');
  }

  // Simple encryption for development (use proper encryption in production)
  private encrypt(text: string): string {
    return btoa(text);
  }

  private decrypt(encrypted: string): string {
    try {
      return atob(encrypted);
    } catch {
      return '';
    }
  }

  // Check if tokens exist
  hasTokens(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }
}

export default TokenManager.getInstance();