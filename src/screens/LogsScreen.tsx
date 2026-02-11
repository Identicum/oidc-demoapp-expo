import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Ionicons } from '@expo/vector-icons';
import { getLogs, clearLogs, LogEntry } from '../loggingSetup';

const COLORS = {
    log: '#757575',
    info: '#2196F3',
    error: '#F44336',
    warn: '#FF9800',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
};

const LogsScreen: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadLogs = useCallback(() => {
        setLogs(getLogs());
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        loadLogs();
        setRefreshing(false);
    }, [loadLogs]);

    const handleClearLogs = () => {
        clearLogs();
        loadLogs();
    };

    const handleCopyAllLogs = () => {
        const logText = logs
            .map(log => `${log.level.toUpperCase()} ${formatTimestamp(log.timestamp)}: ${log.message}`)
            .join('\n');
        Clipboard.setString(logText);
        Alert.alert('Copied', 'All logs copied to clipboard');
    };

    useEffect(() => {
        loadLogs();

        const unsubscribe = () => {
            // Cleanup function
        };

        return unsubscribe;
    }, [loadLogs]);

    const formatTimestamp = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    };

    const renderLogItem = ({ item }: { item: LogEntry }) => (
        <View style={[styles.logItem, { borderLeftColor: COLORS[item.level] }]}>
            <View style={styles.logMeta}>
                <Text style={[styles.logLevel, { color: COLORS[item.level] }]}>
                    {item.level.toUpperCase()}
                </Text>
                <Text style={styles.logTimestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            <Text style={styles.logMessage}>{item.message}</Text>
        </View>
    );

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyText}>No logs yet</Text>
            <Text style={styles.emptySubtext}>Logs from the app and third-party libraries will appear here</Text>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.logCount}>{logs.length} log entries</Text>
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleCopyAllLogs}>
                    <Ionicons name="copy-outline" size={20} color="#2196F3" />
                    <Text style={styles.actionButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={handleClearLogs}>
                    <Ionicons name="trash-outline" size={20} color="#F44336" />
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaProvider style={styles.container}>
            {renderHeader()}
            <FlatList
                data={[...logs].reverse()}
                renderItem={renderLogItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={renderEmptyList}
            />
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logCount: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    actionButtonText: {
        fontSize: 14,
        color: '#2196F3',
        marginLeft: 4,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    clearButtonText: {
        fontSize: 14,
        color: '#F44336',
        marginLeft: 4,
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    logItem: {
        backgroundColor: COLORS.card,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    logMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    logLevel: {
        fontSize: 12,
        fontWeight: '700',
        marginRight: 8,
    },
    logTimestamp: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    logMessage: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});

export default LogsScreen;
