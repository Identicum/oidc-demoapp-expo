// Import logging setup first - before any other imports to capture all console logs
import './src/loggingSetup';

import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigation, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthProvider, useAuth, authEvents, SESSION_EXPIRED_EVENT } from './src/AuthContext';
import { ActivityIndicator, View, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toaster } from 'sonner-native';

// Import your screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ConfigurationScreen from './src/screens/ConfigurationScreen';
import LogsScreen from './src/screens/LogsScreen';

// Define the stack navigator param list
type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    Configuration: undefined;
    Logs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AuthNavigationHandler: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isLoading, isAuthenticated } = useAuth();
    const prevAuthenticated = useRef<boolean | null>(null);

    useEffect(() => {
        if (prevAuthenticated.current === null) {
            prevAuthenticated.current = isAuthenticated;
            return;
        }

        if (prevAuthenticated.current === true && !isAuthenticated && !isLoading) {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                })
            );
        }

        if (prevAuthenticated.current === false && isAuthenticated && !isLoading) {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                })
            );
        }

        prevAuthenticated.current = isAuthenticated;
    }, [isAuthenticated, isLoading, navigation]);

    return null;
};

// Main navigator component
const Navigator: React.FC = () => {
    const { isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        const handleSessionExpired = (): void => {
            Alert.alert(
                "Session Expired",
                "Your session has expired. Please login again.",
                [{ text: "OK" }]
            );
        };

        let sessionExpiredEvent = authEvents.addListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

        return () => {
            sessionExpiredEvent.remove();
        };
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <>
            <AuthNavigationHandler />
            <Stack.Navigator>
                {isAuthenticated ? (
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen
                            name="Logs"
                            component={LogsScreen}
                            options={{ title: 'Logs' }}
                        />
                    </>
                ) : (
                    <>
                        <Stack.Screen
                            name="Login"
                            component={LoginScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen name="Configuration" component={ConfigurationScreen} />
                        <Stack.Screen
                            name="Logs"
                            component={LogsScreen}
                            options={{ title: 'Logs' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </>
    );
};

// Main app component
const App: React.FC = () => {
    return (
        <SafeAreaProvider style={styles.container}>
            <Toaster />
            <AuthProvider>
                <NavigationContainer>
                    <Navigator />
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default App;