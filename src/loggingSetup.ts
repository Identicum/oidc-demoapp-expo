import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LogEntry {
  id: string;
  level: 'log' | 'info' | 'error' | 'warn';
  message: string;
  timestamp: number;
  source?: string;
}

const LOGS_STORAGE_KEY = 'app_logs';
const MAX_LOGS = 1000;

// Global log storage accessible from anywhere
let globalLogs: LogEntry[] = [];
let logsListeners: (() => void)[] = [];

function notifyListeners(): void {
  logsListeners.forEach(listener => listener());
}

function saveLogsToStorage(): void {
  try {
    // Only keep the most recent logs
    const logsToSave = globalLogs.slice(-MAX_LOGS);
    AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logsToSave)).catch(err => {
      console.error('Failed to save logs to storage:', err);
    });
  } catch (error) {
    console.error('Failed to serialize logs for storage:', error);
  }
}

function createLogEntry(
  level: 'log' | 'info' | 'error' | 'warn',
  source: string | undefined,
  args: any[]
): LogEntry {
  const message = args
    .map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');

  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    level,
    message,
    timestamp: Date.now(),
    source,
  };
}

// Console method interception - runs immediately with no imports
const originalConsole = {
  log: console.log,
  info: console.info,
  error: console.error,
  warn: console.warn,
};

function setupConsoleInterception(): void {
  // Capture source based on stack trace
  const getSource = (): string | undefined => {
    try {
      const stack = new Error().stack;
      if (!stack) return undefined;

      // Parse stack trace to find the calling library/component
      const lines = stack.split('\n');
      // Skip the first 2 lines (Error and this function)
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i];

        // Look for node_modules patterns in React Native format
        // Format can be: "at node_modules/react-native/Libraries/Core/ExceptionsManager.js:123:45"
        // or: "at /path/node_modules/@react-native/async-storage/..."
        const nodeModulesMatch = line.match(/node_modules[\/]([^/\s]+)/);
        if (nodeModulesMatch) {
          let packageName = nodeModulesMatch[1];
          // Handle scoped packages like @react-native/async-storage
          const scopedMatch = line.match(/node_modules[\/](@[^/]+\/[^/\s]+)/);
          if (scopedMatch) {
            packageName = scopedMatch[1];
          }
          return `[${packageName}]`;
        }

        // Look for iOS/Android native module paths
        const nativeMatch = line.match(/ios\/Pods\/([^/]+)/);
        if (nativeMatch) {
          return `[${nativeMatch[1]}]`;
        }
      }
    } catch {
      // Fallback to unknown source
    }
    return undefined;
  };

  console.log = (...args: any[]) => {
    globalLogs.push(createLogEntry('log', getSource(), args));
    saveLogsToStorage();
    notifyListeners();
    originalConsole.log.apply(console, args);
  };

  console.info = (...args: any[]) => {
    globalLogs.push(createLogEntry('info', getSource(), args));
    saveLogsToStorage();
    notifyListeners();
    originalConsole.info.apply(console, args);
  };

  console.error = (...args: any[]) => {
    globalLogs.push(createLogEntry('error', getSource(), args));
    saveLogsToStorage();
    notifyListeners();
    originalConsole.error.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    globalLogs.push(createLogEntry('warn', getSource(), args));
    saveLogsToStorage();
    notifyListeners();
    originalConsole.warn.apply(console, args);
  };
}

// Initialize console interception immediately
setupConsoleInterception();

// Load existing logs from storage on module load
AsyncStorage.getItem(LOGS_STORAGE_KEY)
  .then(storedLogs => {
    if (storedLogs) {
      try {
        globalLogs = JSON.parse(storedLogs);
        notifyListeners();
      } catch {
        console.error('Failed to parse stored logs');
      }
    }
  })
  .catch(err => {
    console.error('Failed to load logs from storage:', err);
  });

// Exported functions
export function getLogs(): LogEntry[] {
  return globalLogs;
}

export function clearLogs(): void {
  globalLogs = [];
  AsyncStorage.removeItem(LOGS_STORAGE_KEY).catch(err => {
    console.error('Failed to clear logs from storage:', err);
  });
  notifyListeners();
}

export function addLogsListener(listener: () => void): () => void {
  logsListeners.push(listener);
  return () => {
    logsListeners = logsListeners.filter(l => l !== listener);
  };
}
