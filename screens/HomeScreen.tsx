import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../src/AuthContext';
import authService from '../src/authService';
import { Ionicons } from '@expo/vector-icons';

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
        const tokens = await authService.refreshTokens();

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.headerContainer}>
            <Ionicons name="shield-checkmark" size={28} color="#4CAF50" />
            <Text style={styles.headerText}>Authentication Successful</Text>
          </View>

          <View style={styles.tokenSection}>
            <Text style={styles.tokenTitle}>Access Token</Text>
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

          {authData?.idToken && (
            <>
              <View style={styles.divider} />
              <View style={styles.tokenSection}>
                <Text style={styles.tokenTitle}>ID Token</Text>
                <View style={styles.tokenValueContainer}>
                  <ScrollView>
                    <Text style={styles.tokenValue}>
                      {authData.idToken}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.tokenSection}>
            <Text style={styles.tokenTitle}>Refresh Token</Text>
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

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    marginBottom: 24,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    height: 48,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    marginLeft: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
});

export default HomeScreen;