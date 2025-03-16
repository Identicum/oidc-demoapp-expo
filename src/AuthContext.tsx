import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import authService from './authService';
import { AuthContextType } from './types';
import { NativeEventEmitter } from 'react-native';

// Create an event emitter for authentication events
export const authEvents = new NativeEventEmitter();
export const SESSION_EXPIRED_EVENT = 'sessionExpired';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Initial authentication check
  useEffect(() => {
    const bootstrapAsync = async (): Promise<void> => {
      try {
        const tokens = await authService.getTokens();
        if (tokens) {
          setUserToken(tokens.accessToken);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Login function
  const login = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await authService.login();
      if (result) {
        setUserToken(result.accessToken);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUserToken(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get a fresh access token for API calls
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const tokens = await authService.getTokens();
      return tokens ? tokens.accessToken : null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  };
  
  // Listen for app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
      if (nextAppState === 'active' && isAuthenticated) {
        // App has come to the foreground and was previously authenticated
        const tokens = await authService.getTokens();
        if (!tokens && isAuthenticated) {
          // Tokens are no longer valid, but we thought we were authenticated
          setIsAuthenticated(false);
          setUserToken(null);
          
          // Dispatch event for expired session
          authEvents.emit(SESSION_EXPIRED_EVENT);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Monitor for session expiration
  useEffect(() => {
    const handleSessionExpired = (): void => {
      setIsAuthenticated(false);
      setUserToken(null);
    };
    
    let sessionExpiredEvent = authEvents.addListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    
    return () => {
      sessionExpiredEvent.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        userToken,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};