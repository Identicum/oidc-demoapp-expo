export interface AuthConfig {
  issuer: string;
  clientId: string;
  redirectUrl: string;
  scopes: string[];
  serviceConfiguration: {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    revocationEndpoint: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  accessTokenExpirationDate: number;
  refreshTokenExpirationDate: number;
}

export interface KeychainCredentials {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpirationDate: number;
  refreshTokenExpirationDate?: number;
  tokenType?: string;
  scopes?: string[];
  idToken?: string;
  [key: string]: any;
}

export interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  userToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}