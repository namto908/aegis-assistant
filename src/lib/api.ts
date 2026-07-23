import { Capacitor } from "@capacitor/core";

export const getApiBase = (url?: string): string => {
  const DEFAULT_LAN_URL = "http://192.168.2.200:25530";
  const isNative = Capacitor.isNativePlatform();

  if (!url || url.trim() === "") {
    return DEFAULT_LAN_URL;
  }

  const cleanUrl = url.trim().replace(/\/$/, "");

  if (isNative && (cleanUrl.includes("localhost") || cleanUrl.includes("127.0.0.1"))) {
    return DEFAULT_LAN_URL;
  }

  return cleanUrl;
};
