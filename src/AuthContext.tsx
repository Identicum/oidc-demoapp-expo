import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import * as Keychain from 'react-native-keychain';
import authService from './authService';
import { AuthContextType } from './types';
import { KEYCHAIN_OPTIONS } from './authService';

// Create an event emitter for authentication events
export const authEvents = DeviceEventEmitter;
export const SESSION_EXPIRED_EVENT = 'sessionExpired';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [userToken, setUserToken] = useState<string | null>(null);
    const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);

    // Initial authentication check
    useEffect(() => {
        console.log('Checking authentication status...');
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
            await authService.logoutUser();
            setUserToken(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Listen for app state changes
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
            console.log('App state changed:', nextAppState);

            // Only process when changing to 'active' state and only if it's different from previous state
            if (nextAppState === 'active' && appStateRef.current !== 'active') {
                if (isAuthenticated) {
                    // Request biometrics authentication every time app becomes active
                    try {
                        await Keychain.getGenericPassword(KEYCHAIN_OPTIONS);

                        // Check if tokens are still valid
                        const tokens = await authService.getTokens();
                        if (!tokens && isAuthenticated) {
                            // Tokens are no longer valid, but we thought we were authenticated
                            setIsAuthenticated(false);
                            setUserToken(null);

                            // Dispatch event for expired session
                            authEvents.emit(SESSION_EXPIRED_EVENT);
                        }
                    } catch (error) {
                        console.error('Biometric authentication failed:', error);
                        // Handle biometric authentication failure
                        authEvents.emit(SESSION_EXPIRED_EVENT);
                    }
                }
            }

            // Update the ref only for 'active' or 'background' states to avoid unnecessary state changes
            if (nextAppState === 'active' || nextAppState === 'background') {
                appStateRef.current = nextAppState;
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
                logout
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
