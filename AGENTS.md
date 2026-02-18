# AGENTS.md - Development Guidelines for oidc-demoapp-expo

## Project Overview

This is an Expo React Native application demonstrating OIDC (OpenID Connect) authentication flow using `react-native-app-auth` and secure token storage via `react-native-keychain`.

## Build & Development Commands

### Running the App
```bash
# Start Expo development server
pnpm start

# Run on Android
pnpm android

# Run on iOS
pnpm ios
```

### Environment Setup (Android)
```bash
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools
```

### Type Checking
```bash
# TypeScript strict mode is enabled (tsconfig.json extends expo/tsconfig.base with strict:true)
# Use your IDE's TypeScript support or run:
npx tsc --noEmit
```

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled** - All strict type-checking flags are on
- Always use explicit types for function parameters and return values
- Avoid `any` type - use proper typing or `unknown` with type guards

### Naming Conventions
- **Files**: PascalCase for components (`LoginScreen.tsx`), camelCase for utilities (`authService.ts`)
- **Interfaces/Types**: PascalCase with descriptive names (`AuthTokens`, `AuthContextType`)
- **Constants**: SCREAMING_SNAKE_CASE for configuration keys (`AUTH_CREDENTIALS`, `TOKEN_EXPIRY_KEY`)
- **Components**: PascalCase, descriptive names ending with `Screen` or `Component`

### Import Order
1. External library imports (react, react-native, navigation packages)
2. Third-party dependencies (expo packages, react-native-*)
3. Internal imports (./, src/)

```typescript
// Example import order
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { authorize, logout } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from './types';
import authService from './authService';
```

### Component Patterns

#### Functional Components
```typescript
// Preferred pattern
interface Props {
  param1: string;
  param2?: number;
}

const MyComponent: React.FC<Props> = ({ param1, param2 = 10 }) => {
  // hooks at top
  const [state, setState] = useState<string>('');
  
  // effects below hooks
  useEffect(() => {
    // effect logic
  }, []);
  
  // handlers
  const handlePress = () => {};
  
  // render
  return <View />;
};

export default MyComponent;
```

#### Context Pattern
```typescript
// Create context with proper typing
const MyContext = createContext<MyContextType | null>(null);

export const MyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // provider logic
  return (
    <MyContext.Provider value={/* value */}>
      {children}
    </MyContext.Provider>
  );
};

export const useMyContext = (): MyContextType => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within a MyProvider');
  }
  return context;
};
```

### Error Handling
- Always use try/catch for async operations
- Log errors with descriptive context prefix
- Return null or appropriate fallback values rather than throwing in service functions

```typescript
// Good pattern
const fetchData = async (): Promise<Data | null> => {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.error('[Service] Error fetching data:', error);
    return null;
  }
};
```

### Logging Pattern
- Use `console.info` for operational logs
- Use `console.warn` for recoverable issues
- Use `console.error` for failures
- Prefix all logs with component/service name in brackets

```typescript
console.info('[AuthService] Login initiated');
console.warn('[AuthService] Token refresh failed');
console.error('[AuthService] Error storing tokens:', error);
```

### Security Considerations
- Tokens stored using `react-native-keychain` with `AES_GCM` encryption
- Access control set to `BIOMETRY_ANY_OR_DEVICE_PASSCODE`
- Never log sensitive token data
- Use `Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY`

### Navigation
- Uses `@react-navigation/native` and `@react-navigation/native-stack`
- Define stack param list with proper typing:
```typescript
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Configuration: undefined;
};
```

### Testing
- No test framework currently configured
- If adding tests, place in `__tests__` or `*.test.ts(x)` files alongside source

### File Organization
```
src/
├── AuthContext.tsx      # Auth context and provider
├── authService.ts       # Authentication service (OIDC)
├── configService.ts     # Configuration management
├── loggingSetup.ts      # Logging configuration
├── types.ts            # Shared type definitions
├── types/              # Additional type definitions
└── screens/            # Screen components
    ├── LoginScreen.tsx
    ├── HomeScreen.tsx
    ├── ConfigurationScreen.tsx
    └── LogsScreen.tsx
```

### Common Dependencies
- `react-native-app-auth` - OIDC authorization
- `react-native-keychain` - Secure credential storage
- `@react-native-async-storage/async-storage` - Non-sensitive storage
- `@react-navigation/native` + `@react-navigation/native-stack` - Navigation
- `sonner-native` - Toast notifications
- `react-native-reanimated` - Animations

## Common Tasks

### Adding a New Screen
1. Create file in `src/screens/`
2. Define component with proper Props interface
3. Add route to `RootStackParamList` in App.tsx
4. Add to Navigator in App.tsx with auth condition

### Modifying Auth Flow
- Edit `src/authService.ts` for token handling logic
- Edit `src/AuthContext.tsx` for auth state management
- Use existing patterns - auth flow is well-structured

### Adding New Dependencies
```bash
pnpm add <package-name>
```
Then rebuild with `pnpm android` or `pnpm ios`

## Notes
- This is an Expo managed workflow project
- Uses React 19 and React Native 0.81
- TypeScript strict mode is enforced
- No ESLint/Prettier config currently - follows Expo defaults
