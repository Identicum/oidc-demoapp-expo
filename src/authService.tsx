import * as Keychain from 'react-native-keychain';
import { authorize, refresh, revoke } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthConfig, AuthTokens, KeychainCredentials, AuthResult } from './types';

// Your OAuth configuration (customize for your provider)
const config: AuthConfig = {
    issuer: 'https://idp.demo.idsherpa.com/realms/demo',
    clientId: 'oidc_demoapp_expo',
    redirectUrl: 'com.identicum.demo.mobile.auth:/callback',
    scopes: ['openid', 'profile', 'email'],
};

// Key constants for secure storage
const AUTH_CREDENTIALS = 'auth.credentials';
const TOKEN_EXPIRY_KEY = 'auth.tokenExpiry';
const REFRESH_EXPIRY_KEY = 'auth.refreshExpiry';

// SecureStore options for AES-GCM encryption
export const KEYCHAIN_OPTIONS: Keychain.Options = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
};

// Store tokens securely
const storeTokens = async (authResult: AuthResult): Promise<boolean> => {
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
    const refreshExpiry = authResult.additionalParameters ?
         Date.now() + authResult.additionalParameters.refresh_expires_in * 1000
         : Date.now() + authResult.tokenAdditionalParameters.refresh_expires_in * 1000;

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
    // Get refresh token expiration
    const refreshExpiryStr = await AsyncStorage.getItem(REFRESH_EXPIRY_KEY);
      if (!refreshExpiryStr || Date.now() >= parseInt(refreshExpiryStr, 10)) {
      await clearTokens();
      return null;
    }

    // Get credentials from keychain
    const credentialsResult = await Keychain.getGenericPassword();

    if (!credentialsResult) {
        return null;
    }

    // Parse the stored JSON data
    const credentials = JSON.parse(credentialsResult.password) as KeychainCredentials;
    
    // Perform token refresh
    const refreshedState = await refresh(config, {
      refreshToken: credentials.refreshToken
    });
    
    // Store the new tokens
    await storeTokens(refreshedState);

    return {
      accessToken: refreshedState.accessToken,
      refreshToken: refreshedState.refreshToken,
      accessTokenExpirationDate: new Date(refreshedState.accessTokenExpirationDate).getTime(),
      refreshTokenExpirationDate: refreshedState.additionalParameters ?
                                       Date.now() + refreshedState.additionalParameters.refresh_expires_in * 1000
                                       : Date.now() + refreshedState.tokenAdditionalParameters.refresh_expires_in * 1000
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
const login = async (): Promise<AuthResult | null> => {
  console.info('Logging in');
  try {
    const authState = await authorize(config);
    await storeTokens(authState);
    return authState;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
};

// Logout
const logout = async (): Promise<boolean> => {
  console.info('Logging out');
  try {
    // Get credentials from keychain
    const credentialsResult = await Keychain.getGenericPassword();
    
    if (credentialsResult) {
      // Parse the stored JSON data
      const credentials = JSON.parse(credentialsResult.password) as KeychainCredentials;
      
      await revoke(config, {
        tokenToRevoke: credentials.refreshToken,
        sendClientId: true
      });
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