import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
    Linking
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../AuthContext';
import authService from '../authService';
import { getStoredConfig } from '../configService';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Define the navigation param list type
type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    Profile: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { isAuthenticated, logout } = useAuth();
    const [authData, setAuthData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const openBottomSheet = () => {
        bottomSheetRef.current?.expand();
    };

    const closeBottomSheet = () => {
        bottomSheetRef.current?.close();
    };

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated && !loading) {
            navigation.replace('Login');
        }
    }, [isAuthenticated, loading, navigation]);

    useEffect(() => {
        const fetchTokenData = async () => {
            try {
                setLoading(true);
                // Get tokens from the secure storage via auth context
                const tokens = await authService.getTokens();

                if (tokens) {
                    setAuthData({
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        accessTokenExpirationDate: tokens.accessTokenExpirationDate,
                        refreshTokenExpirationDate: tokens.refreshTokenExpirationDate,
                        idToken: tokens.idToken || null
                    });
                } else {
                    setAuthData(null);
                }
            } catch (error) {
                console.error('Error fetching token data:', error);
                Alert.alert('Error', 'Failed to load authentication data');
            } finally {
                setLoading(false);
            }
        };

        fetchTokenData();
    }, [isAuthenticated]);

    // Format date for display
    const formatDate = (timestamp: number): string => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            await logout();
            // The useEffect will handle navigation once isAuthenticated changes
        } catch (error) {
            console.error('Error logging out:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading authentication data...</Text>
            </View>
        );
    }

    // If not authenticated and still on this screen, show loading until redirect happens
    if (!isAuthenticated) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.card}>
                        <View style={styles.headerContainer}>
                            <View style={styles.headerLeft}>
                                <Ionicons name="shield-checkmark" size={28} color="#4CAF50" />
                                <Text style={styles.headerText}>Authentication Successful</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={openBottomSheet}
                            >
                                <Ionicons name="person-circle" size={28} color="#2196F3" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tokenSection}>
                            <View style={styles.tokenHeaderRow}>
                                <Text style={styles.tokenTitle}>Access Token</Text>
                                <View style={styles.tokenActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            const token = authData?.accessToken || '';
                                            Linking.openURL(`https://jwt.io/#debugger-io?token=${token}`);
                                        }}
                                    >
                                        <Ionicons name="open-outline" size={20} color="#4CAF50" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            Clipboard.setString(authData?.accessToken || '');
                                            Alert.alert('Copied!', 'Access token copied to clipboard');
                                        }}
                                    >
                                        <Ionicons name="copy-outline" size={20} color="#4CAF50" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.tokenValueContainer}>
                                <ScrollView>
                                    <Text style={styles.tokenValue}>
                                        {authData?.accessToken || ''}
                                    </Text>
                                </ScrollView>
                            </View>
                            <Text style={styles.expiryText}>
                                Expires: {formatDate(authData?.accessTokenExpirationDate || 0)}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.tokenSection}>
                            <View style={styles.tokenHeaderRow}>
                                <Text style={styles.tokenTitle}>Refresh Token</Text>
                                <View style={styles.tokenActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            const token = authData?.refreshToken || '';
                                            Linking.openURL(`https://jwt.io/#debugger-io?token=${token}`);
                                        }}
                                    >
                                        <Ionicons name="open-outline" size={20} color="#4CAF50" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            Clipboard.setString(authData?.refreshToken || '');
                                            Alert.alert('Copied!', 'Refresh token copied to clipboard');
                                        }}
                                    >
                                        <Ionicons name="copy-outline" size={20} color="#4CAF50" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.tokenValueContainer}>
                                <ScrollView>
                                    <Text style={styles.tokenValue}>
                                        {authData?.refreshToken || ''}
                                    </Text>
                                </ScrollView>
                            </View>
                            <Text style={styles.expiryText}>
                                Expires: {formatDate(authData?.refreshTokenExpirationDate || 0)}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.tokenSection}>
                            <View style={styles.tokenHeaderRow}>
                                <Text style={styles.tokenTitle}>ID Token</Text>
                                <View style={styles.tokenActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            const token = authData.idToken || '';
                                            Linking.openURL(`https://jwt.io/#debugger-io?token=${token}`);
                                        }}
                                    >
                                        <Ionicons name="open-outline" size={20} color="#4CAF50" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            Clipboard.setString(authData.idToken || '');
                                            Alert.alert('Copied!', 'ID token copied to clipboard');
                                        }}
                                    >
                                        <Ionicons name="copy-outline" size={20} color="#4CAF50" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.tokenValueContainer}>
                                <ScrollView>
                                    <Text style={styles.tokenValue}>
                                        {authData.idToken}
                                    </Text>
                                </ScrollView>
                            </View>
                        </View>

                    </View>
                </ScrollView>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    enableDynamicSizing={true}
                    enablePanDownToClose={true}
                >
                    <BottomSheetView style={styles.bottomSheetContent}>
                        <TouchableOpacity
                            style={styles.bottomSheetButton}
                            onPress={async () => {
                                const config = await getStoredConfig();
                                if (config.accountPageUrl) {
                                    Linking.openURL(config.accountPageUrl);
                                }
                                closeBottomSheet();
                            }}
                        >
                            <Ionicons name="person-outline" size={24} color="#2196F3" />
                            <Text style={styles.bottomSheetButtonText}>Account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.bottomSheetButton}
                            onPress={() => {
                                handleLogout();
                                closeBottomSheet();
                            }}
                        >
                            <Ionicons name="log-out-outline" size={24} color="#F44336" />
                            <Text style={[styles.bottomSheetButtonText, { color: '#F44336' }]}>Logout</Text>
                        </TouchableOpacity>
                    </BottomSheetView>
                </BottomSheet>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    tokenHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tokenActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#E8F5E9',
    },
    scrollContent: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#757575',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#212121',
        marginLeft: 12,
    },
    tokenSection: {
        marginBottom: 16,
    },
    tokenTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212121',
        marginBottom: 8,
    },
    tokenValueContainer: {
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 8,
        minHeight: 80,
        height: 200
    },
    tokenValue: {
        fontSize: 14,
        color: '#616161',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    expiryText: {
        marginTop: 8,
        fontSize: 14,
        color: '#F44336',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 20,
    },
    bottomSheetContent: {
        padding: 20,
        backgroundColor: 'white',
    },
    bottomSheetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    bottomSheetButtonText: {
        fontSize: 18,
        marginLeft: 15,
        color: '#333',
    },
});

export default HomeScreen;