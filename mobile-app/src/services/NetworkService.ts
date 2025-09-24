import NetInfo from '@react-native-community/netinfo';
import {CONFIG} from '../config/config';

export interface NetworkState {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean;
}

class NetworkService {
  private static instance: NetworkService;
  private networkState: NetworkState = {
    isConnected: false,
    type: 'unknown',
    isInternetReachable: false
  };
  private listeners: ((state: NetworkState) => void)[] = [];

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Subscribe to network state changes
    NetInfo.addEventListener(state => {
      this.networkState = {
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable ?? false
      };
      
      // Notify all listeners
      this.listeners.forEach(listener => listener(this.networkState));
    });
  }

  // Get current network state
  async getCurrentState(): Promise<NetworkState> {
    const state = await NetInfo.fetch();
    this.networkState = {
      isConnected: state.isConnected ?? false,
      type: state.type,
      isInternetReachable: state.isInternetReachable ?? false
    };
    return this.networkState;
  }

  // Check if device is online
  isOnline(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable;
  }

  // Add network state listener
  addListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Make API request with retry logic
  async makeRequest(
    url: string, 
    options: RequestInit = {}, 
    retries: number = CONFIG.API.RETRY_ATTEMPTS
  ): Promise<Response> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        // Check if online before making request
        if (!this.isOnline() && i === 0) {
          throw new Error('Device is offline');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's a client error (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (i < retries) {
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw lastError!;
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check server connectivity
  async checkServerConnectivity(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${CONFIG.API.BASE_URL}/api/health/`, {
        method: 'GET'
      }, 1); // Only try once for connectivity check
      
      return response.ok;
    } catch (error) {
      console.error('Server connectivity check failed:', error);
      return false;
    }
  }
}

export default NetworkService;