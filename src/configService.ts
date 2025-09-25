import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthConfiguration } from "react-native-app-auth";
import DeviceInfo from "react-native-device-info";

const CONFIG_KEY = "auth.configuration";

export type CustomConfig = Omit<
  AuthConfiguration,
  "redirectUrl" | "additionalParameters" | "usePKCE"
> & {
  additionalParameters?: { [key: string]: string };
  accountPageUrl?: string;
};

export const defaultConfig: CustomConfig = {
  issuer: "https://idp.demo.idsherpa.com/realms/demo",
  clientId: "oidc_demoapp_expo",
  scopes: ["openid", "profile", "email"],
  accountPageUrl: "https://idp.demo.idsherpa.com/realms/demo/account/",
};

export const getStoredConfig = async (): Promise<typeof defaultConfig> => {
  let config = defaultConfig;

  const storedConfig = await AsyncStorage.getItem(CONFIG_KEY);
  if (storedConfig) {
    const parsedConfig = JSON.parse(storedConfig);
    // Ensure scopes is an array
    if (typeof parsedConfig.scopes === "string") {
      parsedConfig.scopes = parsedConfig.scopes
        .split(",")
        .map((s: string) => s.trim());
    }
    config = parsedConfig;
  }

  return config;
};

export const getAuthConfig = async (): Promise<AuthConfiguration> => {
  let config = await getStoredConfig();

  if (!config.additionalParameters?.sherpa_device_id) {
    const deviceId = await DeviceInfo.getUniqueId();
    config = {
      ...config,
      additionalParameters: {
        ...config.additionalParameters,
        sherpa_device_id: deviceId,
      },
    };
  }
  // Cast to AuthConfiguration since getAuthConfig returns a subset that
  // matches AuthConfiguration except redirectUrl/usePKCE which we add here.
  return {
    ...(config as unknown as AuthConfiguration),
    redirectUrl: "com.identicum.demo.mobile.auth:/callback",
    usePKCE: true,
  } as AuthConfiguration;
};

export const resetAuthConfig = async (): Promise<typeof defaultConfig> => {
  const deviceId = await DeviceInfo.getUniqueId();
  let config = {
    ...defaultConfig,
    additionalParameters: {
      sherpa_device_id: deviceId,
    },
  };

  return config;
};

export const saveAuthConfig = async (
  config: typeof defaultConfig
): Promise<void> => {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};
