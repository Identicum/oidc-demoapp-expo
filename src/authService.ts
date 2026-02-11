import * as Keychain from "react-native-keychain";
import {
  authorize,
  refresh,
  logout,
  AuthorizeResult,
  RefreshResult,
} from "react-native-app-auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthTokens, KeychainCredentials } from "./types";

import { getAuthConfig } from "./configService";

// Key constants for secure storage
const AUTH_CREDENTIALS = "auth.credentials";
const TOKEN_EXPIRY_KEY = "auth.tokenExpiry";
const REFRESH_EXPIRY_KEY = "auth.refreshExpiry";

// SecureStore options for AES-GCM encryption
export const KEYCHAIN_OPTIONS = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  storage: Keychain.STORAGE_TYPE.AES_GCM,
};

// Store tokens securely
const storeTokens = async (
  authResult: AuthorizeResult | RefreshResult,
): Promise<boolean> => {
  console.info("[AuthService] Storing tokens from auth flow");
  try {
    // Prepare credentials object with both tokens
    const credentials: KeychainCredentials = {
      accessToken: authResult.accessToken,
      idToken: authResult.idToken,
      // refreshToken may be undefined|null on some flows; coerce to empty string
      refreshToken: String((authResult as any).refreshToken ?? ""),
    };

    // Store both tokens in a single keychain entry
    console.info("[AuthService] Saving credentials to keychain");
    await Keychain.setGenericPassword(
      AUTH_CREDENTIALS,
      JSON.stringify(credentials),
      KEYCHAIN_OPTIONS,
    );
    console.info("[AuthService] Credentials saved successfully");

    // Store expiration timestamps in AsyncStorage
    const accessExpiry = new Date(
      (authResult as any).accessTokenExpirationDate,
    ).getTime();
    const refreshExpiresRaw =
      (authResult as any).additionalParameters?.refresh_expires_in ??
      (authResult as any).tokenAdditionalParameters?.refresh_expires_in;
    const refreshExpiry = Date.now() + Number(refreshExpiresRaw ?? 0) * 1000;

    console.info(
      `[AuthService] Access token expires at: ${new Date(accessExpiry).toISOString()}`,
    );
    await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, accessExpiry.toString());
    await AsyncStorage.setItem(REFRESH_EXPIRY_KEY, refreshExpiry.toString());

    console.info("[AuthService] Token storage complete");
    return true;
  } catch (error) {
    console.error("[AuthService] Error storing tokens:", error);
    return false;
  }
};

// Get tokens and check expiration
const getTokens = async (): Promise<AuthTokens | null> => {
  console.info("[AuthService] getTokens called");
  try {
    // Get expiration timestamps
    const accessExpiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    const refreshExpiryStr = await AsyncStorage.getItem(REFRESH_EXPIRY_KEY);

    if (!accessExpiryStr || !refreshExpiryStr) {
      console.info(
        "[AuthService] No tokens found - expiry dates not in AsyncStorage",
      );
      return null;
    }

    const accessExpiry = parseInt(accessExpiryStr, 10);
    const refreshExpiry = parseInt(refreshExpiryStr, 10);
    const now = Date.now();
    const msUntilExpiry = accessExpiry - now;

    console.info(
      `[AuthService] Token check - expires in ${Math.round(msUntilExpiry / 1000 / 60)} minutes`,
    );

    // Check if access token has expired first
    if (now >= accessExpiry) {
      console.info("[AuthService] Access token expired, attempting refresh");
      // Try to refresh the token
      const newTokens = await refreshTokens();
      if (newTokens) {
        console.info("[AuthService] Token refresh successful");
        return newTokens;
      }
      console.warn("[AuthService] Token refresh failed - tokens cleared");
      return null;
    }

    console.info("[AuthService] Access token valid, retrieving from keychain");
    // Get credentials from keychain
    const credentialsResult = await Keychain.getGenericPassword();

    if (!credentialsResult) {
      console.warn("[AuthService] No credentials found in keychain");
      return null;
    }

    // Parse the stored JSON data
    const credentials = JSON.parse(
      credentialsResult.password,
    ) as KeychainCredentials;

    const tokens = {
      accessToken: credentials.accessToken,
      accessTokenExpirationDate: accessExpiry,
      idToken: credentials.idToken,
      refreshToken: credentials.refreshToken,
      refreshTokenExpirationDate: refreshExpiry,
    };

    console.info(
      `[AuthService] Tokens retrieved successfully - idToken present: ${!!tokens.idToken}`,
    );

    return tokens;
  } catch (error) {
    console.error("[AuthService] Error getting tokens:", error);
    return null;
  }
};

// Refresh tokens
const refreshTokens = async (): Promise<AuthTokens | null> => {
  console.info("[AuthService] Refreshing tokens");
  try {
    // Get credentials from keychain
    const credentialsResult = await Keychain.getGenericPassword();
    if (!credentialsResult) {
      console.warn("[AuthService] No credentials found for refresh");
      return null;
    }
    const credentials = JSON.parse(
      credentialsResult.password,
    ) as KeychainCredentials;
    const refreshToken = credentials.refreshToken;

    if (!refreshToken) {
      console.warn("[AuthService] No refresh token available");
      return null;
    }

    console.info("[AuthService] Calling OIDC token refresh endpoint");
    const config = await getAuthConfig();
    const refreshedState = await refresh(config, { refreshToken });
    console.info("[AuthService] Token refresh response received");

    // Store the new tokens
    await storeTokens(refreshedState);

    const accessExp = new Date(
      (refreshedState as any).accessTokenExpirationDate,
    ).getTime();
    const refreshExpiresRaw =
      (refreshedState as any).additionalParameters?.refresh_expires_in ??
      (refreshedState as any).tokenAdditionalParameters?.refresh_expires_in;

    console.info(
      `[AuthService] Token refresh complete - new expiry: ${new Date(accessExp).toISOString()}`,
    );

    return {
      accessToken: refreshedState.accessToken,
      accessTokenExpirationDate: accessExp,
      idToken: refreshedState.idToken,
      refreshToken: String((refreshedState as any).refreshToken ?? ""),
      refreshTokenExpirationDate:
        Date.now() + Number(refreshExpiresRaw ?? 0) * 1000,
    };
  } catch (error) {
    console.warn("[AuthService] Token refresh failed:", error);
    console.info("[AuthService] Clearing tokens after refresh failure");
    await clearTokens();
    return null;
  }
};

// Clear all tokens
const clearTokens = async (): Promise<boolean> => {
  console.info("[AuthService] Clearing all tokens");
  try {
    await Keychain.resetGenericPassword();
    console.info("[AuthService] Keychain cleared");
    await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
    await AsyncStorage.removeItem(REFRESH_EXPIRY_KEY);
    console.info("[AuthService] AsyncStorage cleared");
    return true;
  } catch (error) {
    console.error("[AuthService] Error clearing tokens:", error);
    return false;
  }
};

// Login
const login = async (): Promise<AuthTokens | null> => {
  console.info("[AuthService] Login initiated");
  try {
    const config = await getAuthConfig();
    console.info(
      `[AuthService] Login config - issuer: ${config.issuer}, clientId: ${config.clientId}`,
    );

    console.info("[AuthService] Starting OIDC authorization flow");
    const authState = await authorize(config);
    console.info("[AuthService] Authorization response received");

    console.info("[AuthService] Storing tokens after successful auth");
    const stored = await storeTokens(authState);
    if (stored) {
      const accessExp = new Date(
        (authState as any).accessTokenExpirationDate,
      ).getTime();
      const refreshExpiresRaw =
        (authState as any).additionalParameters?.refresh_expires_in ??
        (authState as any).tokenAdditionalParameters?.refresh_expires_in;
      console.info(
        `[AuthService] Login successful - accessToken expires: ${new Date(accessExp).toISOString()}`,
      );
      return {
        accessToken: authState.accessToken,
        accessTokenExpirationDate: accessExp,
        idToken: authState.idToken,
        refreshToken: String((authState as any).refreshToken ?? ""),
        refreshTokenExpirationDate:
          Date.now() + Number(refreshExpiresRaw ?? 0) * 1000,
      };
    }
    console.warn("[AuthService] Login failed - token storage unsuccessful");
    return null;
  } catch (error) {
    console.error("[AuthService] Login failed:", error);
    return null;
  }
};

// Logout
const logoutUser = async (idToken: string): Promise<boolean> => {
  console.info("[AuthService] Logout initiated");
  try {
    const config = await getAuthConfig();

    console.info("[AuthService] Calling OIDC logout endpoint");
    await logout(config, {
      idToken: idToken,
      postLogoutRedirectUrl: config.redirectUrl,
    });
    console.info("[AuthService] OIDC logout successful");

    console.info("[AuthService] Clearing local tokens");
    return await clearTokens();
  } catch (error) {
    console.warn(
      "[AuthService] Logout error (proceeding with local clear):",
      error,
    );
    await clearTokens();
    return true;
  }
};

// Check if user is authenticated
const isAuthenticated = async (): Promise<boolean> => {
  const tokens = await getTokens();
  return tokens !== null;
};

export default {
  login,
  logoutUser,
  isAuthenticated,
  getTokens,
  refreshTokens,
};
