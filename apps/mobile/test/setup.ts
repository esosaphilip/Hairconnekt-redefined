process.env.EXPO_PUBLIC_API_URL = 'https://api.test.hairconnekt.de/api/v1';

// In-memory mock for AsyncStorage
const asyncStorageStore = new Map<string, string>();
export const mockAsyncStorage = {
  getItem: jest.fn(async (key: string) => asyncStorageStore.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    asyncStorageStore.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    asyncStorageStore.delete(key);
  }),
  clear: jest.fn(async () => {
    asyncStorageStore.clear();
  }),
  _store: asyncStorageStore,
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// In-memory mock for SecureStore
const secureStore = new Map<string, string>();
export const mockSecureStore = {
  getItemAsync: jest.fn(async (key: string) => secureStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    secureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    secureStore.delete(key);
  }),
  _store: secureStore,
};

jest.mock('expo-secure-store', () => mockSecureStore);

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock react-native
jest.mock('react-native', () => ({
  StyleSheet: { create: (s: any) => s },
  ActivityIndicator: 'ActivityIndicator',
  SafeAreaView: 'SafeAreaView',
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
}));

// Clean stores before each test
beforeEach(() => {
  asyncStorageStore.clear();
  secureStore.clear();
  jest.clearAllMocks();
});
