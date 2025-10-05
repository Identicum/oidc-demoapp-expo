import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { saveAuthConfig, resetAuthConfig, getStoredConfig } from '../configService';

const ConfigurationScreen = () => {
    const [issuer, setIssuer] = useState('');
    const [clientId, setClientId] = useState('');
    const [scopes, setScopes] = useState<string[]>([]);
    const [additionalParameters, setAdditionalParameters] = useState('');
    const [accountPageUrl, setAccountPageUrl] = useState('');
    const [deleteAccountUrl, setDeleteAccountUrl] = useState('');

    useEffect(() => {
        const loadConfig = async () => {
            const config = await getStoredConfig();
            setIssuer(config.issuer || '');
            setClientId(config.clientId || '');
            setScopes(config.scopes || []);
            setAccountPageUrl(config.accountPageUrl || '');
            setDeleteAccountUrl(config.deleteAccountUrl || '');
            setAdditionalParameters(JSON.stringify(config.additionalParameters || {}, null, 2));
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        try {
            let params = {};
            if (additionalParameters) {
                params = JSON.parse(additionalParameters);
            }
            await saveAuthConfig({
                issuer,
                clientId,
                scopes,
                accountPageUrl,
                deleteAccountUrl,
                additionalParameters: params,
            });
            Alert.alert('Success', 'Configuration saved successfully.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save configuration. Please check the format of the additional parameters.');
            console.error('Failed to save config', error);
        }
    };

    const handleReset = async () => {
        const config = await resetAuthConfig();
        setIssuer(config.issuer || '');
        setClientId(config.clientId || '');
        setScopes(config.scopes || []);
        setAccountPageUrl(config.accountPageUrl || '');
        setDeleteAccountUrl(config.deleteAccountUrl || '');
        setAdditionalParameters(JSON.stringify(config.additionalParameters || {}, null, 2));
        await saveAuthConfig(config);
        Alert.alert('Success', 'Configuration has been reset to default.');
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.label}>Issuer</Text>
            <TextInput
                style={styles.input}
                value={issuer}
                onChangeText={setIssuer}
                autoCapitalize="none"
            />

            <Text style={styles.label}>Client ID</Text>
            <TextInput
                style={styles.input}
                value={clientId}
                onChangeText={setClientId}
                autoCapitalize="none"
            />

            <Text style={styles.label}>Scopes (comma-separated)</Text>
            <TextInput
                style={styles.input}
                value={scopes.join(', ')}
                onChangeText={(text) => setScopes(text.split(',').map(s => s.trim()))}
                autoCapitalize="none"
            />

            <Text style={styles.label}>Additional Parameters (JSON format)</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={additionalParameters}
                onChangeText={setAdditionalParameters}
                multiline
                numberOfLines={4}
                autoCapitalize="none"
            />

            <Text style={styles.label}>Account Page URL</Text>
            <TextInput
                style={styles.input}
                value={accountPageUrl}
                onChangeText={setAccountPageUrl}
                autoCapitalize="none"
            />

            <Text style={styles.label}>Delete Account URL</Text>
            <TextInput
                style={styles.input}
                value={deleteAccountUrl}
                onChangeText={setDeleteAccountUrl}
                autoCapitalize="none"
            />

            <Button title="Save Configuration" onPress={handleSave} />
            <View style={styles.buttonSpacer} />
            <Button title="Reset to Default" onPress={handleReset} color="red" />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    buttonSpacer: {
        height: 10,
    }
});

export default ConfigurationScreen;
