import * as Keychain from 'react-native-keychain';
import { authorize, refresh, revoke, AuthConfiguration, AuthorizeResult, RefreshResult } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens, KeychainCredentials } from './types';
import DeviceInfo from 'react-native-device-info';

// Your OAuth configuration (customize for your provider)
const getConfig = async (): Promise<AuthConfiguration> => {
    const deviceId = await DeviceInfo.getUniqueId();
    console.log('Device ID:', deviceId);
    return {
        issuer: 'https://idp.demo.idsherpa.com/realms/demo',
        clientId: 'oidc_demoapp_expo',
        redirectUrl: 'com.identicum.demo.mobile.auth:/callback',
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
        additionalParameters: {
            'claropay_device_id': deviceId
        }
    };
};

// Key constants for secure storage
const AUTH_CREDENTIALS = 'auth.credentials';
const TOKEN_EXPIRY_KEY = 'auth.tokenExpiry';
const REFRESH_EXPIRY_KEY = 'auth.refreshExpiry';

// SecureStore options for AES-GCM encryption
export const KEYCHAIN_OPTIONS = {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    storage: Keychain.STORAGE_TYPE.AES_GCM,
};

// Store tokens securely
const storeTokens = async (authResult: AuthorizeResult | RefreshResult): Promise<boolean> => {
    console.info('Storing tokens:', authResult);
    try {
        // Prepare credentials object with both tokens
        const credentials: KeychainCredentials = {
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken
        };

        // Store both tokens in a single keychain entry
        await Keychain.setGenericPassword(
            AUTH_CREDENTIALS,
            JSON.stringify(credentials),
            KEYCHAIN_OPTIONS
        );

        // Store expiration timestamps in AsyncStorage
        const accessExpiry = new Date(authResult.accessTokenExpirationDate).getTime();
        const refreshExpiry = "additionalParameters" in authResult ?
            Date.now() + Number(authResult.additionalParameters?.refresh_expires_in) * 1000
            : Date.now() + Number(authResult.tokenAdditionalParameters.refresh_expires_in) * 1000;

        await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, accessExpiry.toString());
        await AsyncStorage.setItem(REFRESH_EXPIRY_KEY, refreshExpiry.toString());

        return true;
    } catch (error) {
        console.error('Error storing tokens:', error);
        return false;
    }
};

// Get tokens and check expiration
const getTokens = async (): Promise<AuthTokens | null> => {
    console.info('Getting tokens');
    try {
        // Get expiration timestamps
        const accessExpiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
        const refreshExpiryStr = await AsyncStorage.getItem(REFRESH_EXPIRY_KEY);

        if (!accessExpiryStr || !refreshExpiryStr) {
            return null;
        }

        const accessExpiry = parseInt(accessExpiryStr, 10);
        const refreshExpiry = parseInt(refreshExpiryStr, 10);
        const now = Date.now();

        // Check if access token has expired first
        if (now >= accessExpiry) {
            // Try to refresh the token
            const newTokens = await refreshTokens();
            if (newTokens) {
                return newTokens;
            }
            return null;
        }

        // Get credentials from keychain
        const credentialsResult = await Keychain.getGenericPassword();

        if (!credentialsResult) {
            return null;
        }

        // Parse the stored JSON data
        const credentials = JSON.parse(credentialsResult.password) as KeychainCredentials;

        return {
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            accessTokenExpirationDate: accessExpiry,
            refreshTokenExpirationDate: refreshExpiry
        };
    } catch (error) {
        console.error('Error getting tokens:', error);
        return null;
    }
};

// Refresh tokens
const refreshTokens = async (): Promise<AuthTokens | null> => {
    console.info('Refreshing tokens');
    try {
        // Get credentials from keychain
        const credentialsResult = await Keychain.getGenericPassword();
        if (!credentialsResult) {
            return null;
        }
        const credentials = JSON.parse(credentialsResult.password) as KeychainCredentials;
        const refreshToken = credentials.refreshToken;

        if (!refreshToken) {
            return null;
        }

        const config = await getConfig();
        const refreshedState = await refresh(config, {
            refreshToken: refreshToken,
        });

        // Store the new tokens
        await storeTokens(refreshedState);

        return {
            accessToken: refreshedState.accessToken,
            refreshToken: refreshedState.refreshToken,
            accessTokenExpirationDate: new Date(refreshedState.accessTokenExpirationDate).getTime(),
            refreshTokenExpirationDate: Date.now() + Number(refreshedState.additionalParameters?.refresh_expires_in) * 1000
        };
    } catch (error) {
        console.error('Error refreshing token:', error);
        await clearTokens();
        return null;
    }
};

// Clear all tokens
const clearTokens = async (): Promise<boolean> => {
    console.info('Clearing tokens');
    try {
        await Keychain.resetGenericPassword();
        await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
        await AsyncStorage.removeItem(REFRESH_EXPIRY_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing tokens:', error);
        return false;
    }
};

// Login
const login = async (): Promise<AuthorizeResult | null> => {
    console.info('Logging in');
    try {
        const config = await getConfig();
        console.info('Logging in with config: ' + JSON.stringify(config));

        const authState = await authorize(config);
        const stored = await storeTokens(authState);
        if (stored) {
            return {
                accessToken: authState.accessToken,
                refreshToken: authState.refreshToken,
                accessTokenExpirationDate: new Date(authState.accessTokenExpirationDate).getTime(),
                refreshTokenExpirationDate: Date.now() + Number(authState.additionalParameters?.refresh_expires_in) * 1000
            };
        }
        return null;
    } catch (error) {
        console.error('Login failed:', error);
        return null;
    }
};

// Logout
const logout = async (): Promise<boolean> => {
    console.info('Logging out');
    try {
        const config = await getConfig();
        // Get credentials from keychain
        const credentialsResult = await Keychain.getGenericPassword();
        if (credentialsResult) {
            const credentials = JSON.parse(credentialsResult.password) as KeychainCredentials;
            const refreshToken = credentials.refreshToken;

            // Revoke token if it exists
            if (refreshToken) {
                await revoke(config, {
                    tokenToRevoke: refreshToken,
                    includeBasicAuth: true,
                });
            }
        }

        return await clearTokens();
    } catch (error) {
        console.error('Logout error:', error);
        await clearTokens();
        return false;
    }
};

// Check if user is authenticated
const isAuthenticated = async (): Promise<boolean> => {
    const tokens = await getTokens();
    return tokens !== null;
};

export default {
    login,
    logout,
    isAuthenticated,
    getTokens,
    refreshTokens
};