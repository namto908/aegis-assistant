export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  priority: "High" | "Medium" | "Low";
  completed: boolean;
  createdAt: string;
}

export interface ServerStatus {
  id: string;
  name: string;
  url: string;
  status: "up" | "down";
  uptime: number; // e.g. 99.98
  latency: number; // in ms
  lastPing: string;
  history: number[]; // response times for sparkline chart
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  category: "task" | "server" | "system" | "news";
  read: boolean;
  timestamp: string;
  contentDetail?: string;
  sourceUrl?: string;
}

export type ThemeColor = "cyan" | "blue" | "emerald" | "purple" | "rose" | "amber" | "slate";

export interface AssistantConfig {
  name: string;
  prompt: string;
  avatarUrl: string;
  themeColor?: ThemeColor;
  apiBaseUrl?: string;
}

export type HomeLayoutVariant = "bento" | "streamlined" | "minimal";

export type ScreenType = "home" | "tasks" | "notifications" | "server" | "chat" | "settings";

export interface Message {
  role: "user" | "model";
  content: string;
  timestamp: string;
  image?: string;
  file?: string;
  fileName?: string;
  thinking?: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  idToken: string;
}
