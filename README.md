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
    // only for testing purposes
    dangerouslyAllowInsecureHttpRequests: true
};
```

## Pre-requisites 
- Android Studio / Xcode
- yarn
- npx


## Steps 
yarn install

### Android 
npx expo run:android

### iOS 
npx expo run:ios


## Upload to Play Store 

https://docs.expo.dev/submit/android/