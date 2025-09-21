import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    Configuration: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'Login'
>;

interface LoginScreenProps {
    navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
    const { login, isLoading } = useAuth();

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation.navigate('Configuration')}
            >
                <MaterialIcons name="settings" size={24} color="#444" />
            </TouchableOpacity>
            <View style={styles.welcomeCard}>
                <MaterialIcons name="lock" size={60} color="#4285F4" style={styles.lockIcon} />
                <Text style={styles.title}>Welcome</Text>
                <Text style={styles.subtitle}>
                    Please authenticate using your credentials
                </Text>

                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={login}
                    disabled={isLoading}
                >
                    <MaterialIcons name="login" size={20} color="#fff" />
                    <Text style={styles.buttonText}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    loginButton: {
        backgroundColor: '#4285F4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 6,
        width: '100%',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    welcomeCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 30,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    settingsButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 10,
    },
});

export default LoginScreen;