export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  accessTokenExpirationDate: number;
  refreshTokenExpirationDate: number;
}

export interface KeychainCredentials {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}
export interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  userToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}