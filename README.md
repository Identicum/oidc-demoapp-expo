# Steps to run the project

## IDP Configuration

Create a public client

## Code Configuration

Edit the authService.tsx file and update the following values
    
```
const config = {
    issuer: 'https://idp.demo.idsherpa.com/realms/demo',
    clientId: 'oidc-demoapp-expo',
    redirectUrl: 'com.identicum.demo.mobile.auth:/callback',
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    additionalParameters: {
        'claropay_device_id': deviceId
    }
    // only for testing purposes
    dangerouslyAllowInsecureHttpRequests: true
};
```

## Pre-requisites 
- Android Studio / Xcode
- yarn
- npx
- Set ENV variables 
  - export ANDROID_HOME=~/Library/Android/sdk
  - export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools


## Steps 
yarn install

### Android 
pnpm run android | npx expo run:android

### iOS 
pnpm run ios | npx expo run:ios (--device)


## Upload to Play Store 

https://docs.expo.dev/submit/android/