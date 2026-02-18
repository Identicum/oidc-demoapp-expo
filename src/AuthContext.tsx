import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import authService from './authService';
import { AuthContextType, AuthTokens } from './types';
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
    const [authData, setAuthData] = useState<AuthTokens | null>(null);
    const isAuthenticatedRef = useRef(isAuthenticated);

    useEffect(() => {
        isAuthenticatedRef.current = isAuthenticated;
    }, [isAuthenticated]);

    // Initial authentication check
    useEffect(() => {
        console.info('[AuthContext] Bootstrap - checking authentication status');
        const bootstrapAsync = async (): Promise<void> => {
            try {
                const tokens = await authService.getTokens();
                if (tokens) {
                    console.info('[AuthContext] Bootstrap - found existing session');
                    setAuthData(tokens);
                    setIsAuthenticated(true);
                    console.info('[AuthContext] State updated - authenticated=true');
                } else {
                    console.info('[AuthContext] Bootstrap - no existing session');
                }
            } catch (error) {
                console.error('[AuthContext] Bootstrap - failed to load tokens:', error);
            } finally {
                setIsLoading(false);
            }
        };

        bootstrapAsync();
    }, []);

    // Login function
    const login = async (): Promise<void> => {
        console.info('[AuthContext] Login function called');
        setIsLoading(true);
        try {
            const result = await authService.login();
            if (result) {
                console.info('[AuthContext] Login successful, updating state');
                setAuthData(result);
                setIsAuthenticated(true);
                console.info('[AuthContext] State updated - authenticated=true');
            } else {
                console.warn('[AuthContext] Login returned null');
            }
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logoutUser = async (): Promise<void> => {
        console.info('[AuthContext] Logout function called');
        const idToken = authData?.idToken;
        setIsLoading(true);
        try {
            if (idToken) {
                await authService.logoutUser(idToken);
            }
            console.info('[AuthContext] Logout service completed, clearing state');
            setAuthData(null);
            setIsAuthenticated(false);
            console.info('[AuthContext] State updated - authenticated=false');
        } catch (error) {
            console.error('[AuthContext] Logout failed:', error);
            setAuthData(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Listen for app state changes
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
            console.info(`[AuthContext] App state changed: ${nextAppState}`);

            if (nextAppState === 'active') {
                if (isAuthenticatedRef.current) {
                    console.info('[AuthContext] App came to foreground, validating session');

                    try {
                        const tokens = await authService.getTokens();
                        if (!tokens && isAuthenticatedRef.current) {
                            console.warn('[AuthContext] Session expired on foreground');
                            setIsAuthenticated(false);
                            setAuthData(null);

                            authEvents.emit(SESSION_EXPIRED_EVENT);
                        } else {
                            console.info('[AuthContext] Session valid on foreground');
                        }
                    } catch (error) {
                        console.error('[AuthContext] Session validation failed:', error);
                        authEvents.emit(SESSION_EXPIRED_EVENT);
                    }
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    // Monitor for session expiration
    useEffect(() => {
        const handleSessionExpired = (): void => {
            setIsAuthenticated(false);
            setAuthData(null);
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
                authData,
                login,
                logoutUser
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
