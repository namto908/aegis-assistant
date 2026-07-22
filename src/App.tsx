import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { 
  Home, CheckSquare, Bell, Server, MessageSquare, Settings, 
  Wifi, Battery, Shield, Sparkles, Clock, Smartphone, Info 
} from "lucide-react";
import { Task, ServerStatus, Notification, AssistantConfig, ScreenType } from "./types";
import { getThemeClasses } from "./lib/theme";
import Dashboard from "./components/Dashboard";
import TasksList from "./components/TasksList";
import NotificationsCenter from "./components/NotificationsCenter";
import ServerMonitoring from "./components/ServerMonitoring";
import AssistantChat from "./components/AssistantChat";
import SettingsPanel from "./components/SettingsPanel";

// Seed Data
const DEFAULT_TASKS: Task[] = [];

const DEFAULT_SERVERS: ServerStatus[] = [];

const DEFAULT_NOTIFICATIONS: Notification[] = [];

const DEFAULT_ASSISTANT: AssistantConfig = {
  name: "Aegis",
  prompt: "Bạn là Aegis, trợ lý ảo cá nhân đa năng rành công nghệ, tính cách lôi cuốn, tinh tế và luôn đặt bảo mật lên hàng đầu. Hãy trả lời ngắn gọn, thiết thực, có cấu trúc sử dụng Markdown nhẹ bằng Tiếng Việt.",
  avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
  themeColor: "slate"
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig>(DEFAULT_ASSISTANT);
  const [screen, setScreen] = useState<ScreenType>("home");
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(["home"]);
  const [exitToast, setExitToast] = useState<boolean>(false);
  const lastBackTimeRef = useRef<number>(0);
  const [phoneTime, setPhoneTime] = useState<string>("");
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  const lastNavTimeRef = useRef<number>(0);

  const changeScreen = (newScreen: ScreenType) => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 120) return;
    lastNavTimeRef.current = now;

    if (newScreen === screen) return;
    setScreen(newScreen);
    setScreenHistory((prev) => [...prev, newScreen]);
  };

  // Handle Native Android Hardware Back Button / Back Gesture & Edge-to-Edge Status Bar
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

    const backListenerPromise = CapApp.addListener("backButton", () => {
      if (screen !== "home" && screenHistory.length > 1) {
        setScreenHistory((prev) => {
          const newHistory = [...prev];
          newHistory.pop();
          const prevScreen = newHistory[newHistory.length - 1] || "home";
          setScreen(prevScreen);
          return newHistory;
        });
      } else if (screen !== "home") {
        setScreen("home");
        setScreenHistory(["home"]);
      } else {
        const now = Date.now();
        if (now - lastBackTimeRef.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackTimeRef.current = now;
          setExitToast(true);
          setTimeout(() => {
            setExitToast(false);
          }, 2000);
        }
      }
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove());
    };
  }, [screen, screenHistory]);

  // Load and Save Local Storage State
  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem("aegis_tasks");
      const storedServers = localStorage.getItem("aegis_servers");
      const storedNotifications = localStorage.getItem("aegis_notifications");
      const storedAssistant = localStorage.getItem("aegis_assistant");

      if (storedTasks) setTasks(JSON.parse(storedTasks));
      else setTasks(DEFAULT_TASKS);

      if (storedServers) setServers(JSON.parse(storedServers));
      else setServers(DEFAULT_SERVERS);

      if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
      else setNotifications(DEFAULT_NOTIFICATIONS);

      if (storedAssistant) setAssistantConfig(JSON.parse(storedAssistant));
      else setAssistantConfig(DEFAULT_ASSISTANT);
    } catch (e) {
      console.error("Local Storage Load Error:", e);
      setTasks(DEFAULT_TASKS);
      setServers(DEFAULT_SERVERS);
      setNotifications(DEFAULT_NOTIFICATIONS);
      setAssistantConfig(DEFAULT_ASSISTANT);
    }
  }, []);

  // Save states to local storage on changes
  useEffect(() => {
    if (tasks.length > 0) localStorage.setItem("aegis_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (servers.length > 0) localStorage.setItem("aegis_servers", JSON.stringify(servers));
  }, [servers]);

  useEffect(() => {
    if (notifications.length > 0) localStorage.setItem("aegis_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("aegis_assistant", JSON.stringify(assistantConfig));
  }, [assistantConfig]);

  // Update real-time smartphone clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPhoneTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const timerId = setInterval(updateTime, 60000);
    return () => clearInterval(timerId);
  }, []);

  // Helper to append a notification
  const addNotification = (title: string, description: string, category: "task" | "server" | "system") => {
    const newNotif: Notification = {
      id: "notif_" + Date.now(),
      title,
      description,
      category,
      read: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const resetMockData = () => {
    localStorage.removeItem("aegis_tasks");
    localStorage.removeItem("aegis_servers");
    localStorage.removeItem("aegis_notifications");
    localStorage.removeItem("aegis_assistant");
    setTasks([]);
    setServers([]);
    setNotifications([]);
    setAssistantConfig(DEFAULT_ASSISTANT);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const theme = getThemeClasses(assistantConfig.themeColor || "slate");

  // Render proper screen content
  const renderScreenContent = () => {
    switch (screen) {
      case "home":
        return (
          <Dashboard 
            tasks={tasks} 
            servers={servers} 
            notifications={notifications} 
            assistantConfig={assistantConfig}
            setScreen={setScreen}
          />
        );
      case "tasks":
        return (
          <TasksList 
            tasks={tasks} 
            setTasks={setTasks} 
            addNotification={addNotification} 
            themeColor={assistantConfig.themeColor || "slate"}
          />
        );
      case "notifications":
        return (
          <NotificationsCenter 
            notifications={notifications} 
            setNotifications={setNotifications} 
            themeColor={assistantConfig.themeColor || "slate"}
            tasks={tasks}
            servers={servers}
            setScreen={setScreen}
            onDiscussWithChatbot={(msg) => {
              setChatPrefill(msg);
              setScreen("chat");
            }}
            apiBaseUrl={assistantConfig.apiBaseUrl}
          />
        );
      case "server":
        return (
          <ServerMonitoring 
            servers={servers} 
            setServers={setServers} 
            addNotification={addNotification} 
            themeColor={assistantConfig.themeColor || "slate"}
          />
        );
      case "chat":
        return (
          <AssistantChat 
            assistantConfig={assistantConfig} 
            tasks={tasks} 
            servers={servers} 
            addNotification={addNotification}
            prefillMessage={chatPrefill}
            clearPrefillMessage={() => setChatPrefill(null)}
          />
        );
      case "settings":
        return (
          <SettingsPanel 
            assistantConfig={assistantConfig} 
            setAssistantConfig={setAssistantConfig} 
            resetMockData={resetMockData}
            addNotification={addNotification}
          />
        );
    }
  };

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    return (
      <div className="relative h-screen w-screen max-h-screen overflow-hidden flex flex-col bg-slate-950 font-sans select-none text-slate-100">
        
        {/* Ambient background glow matching theme */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-500/10 opacity-30 pointer-events-none transform-gpu"></div>

        {/* Active Screen Area with safe padding top (pt-11 / 44px) for Mi 15 teardrop/punch-hole notch */}
        <div className="flex-1 overflow-y-auto px-4 pt-11 pb-2 no-scrollbar z-30 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className="h-full flex flex-col flex-1 min-h-0 transform-gpu"
            >
              {renderScreenContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Toast alert for exit app prompt on Android */}
        <AnimatePresence>
          {exitToast && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/90 text-slate-100 border border-white/15 px-4 py-2 rounded-full shadow-2xl text-[11px] font-medium backdrop-blur-xl flex items-center gap-2 select-none whitespace-nowrap"
            >
              <Info size={14} className={`${theme.text}`} />
              <span>Vuốt / Nhấn lại lần nữa để thoát ứng dụng</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Phone Bottom Navigation Bar */}
        <div className="h-16 flex-shrink-0 px-4 pb-2 glass-panel border-t border-white/10 flex items-center justify-around z-50 select-none bg-slate-950/90 backdrop-blur-xl">
          {/* Home Tab */}
          <button 
            onClick={() => changeScreen("home")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "home" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-home-tab"
            title="Tổng hợp"
          >
            <Home size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Home</span>
          </button>

          {/* Tasks Tab */}
          <button 
            onClick={() => changeScreen("tasks")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "tasks" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-tasks-tab"
            title="Công việc"
          >
            <CheckSquare size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Tasks</span>
          </button>

          {/* Server Tab */}
          <button 
            onClick={() => changeScreen("server")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "server" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-server-tab"
            title="Giám sát máy chủ"
          >
            <Server size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Uptime</span>
          </button>

          {/* Assistant Chat Tab */}
          <button 
            onClick={() => changeScreen("chat")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "chat" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-chat-tab"
            title="Trò chuyện AI"
          >
            <MessageSquare size={18} className={screen === "chat" ? "" : "animate-pulse"} />
            <span className="text-[9px] mt-0.5 font-medium">Trợ lý</span>
          </button>

          {/* Notifications Tab */}
          <button 
            onClick={() => changeScreen("notifications")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer relative ${screen === "notifications" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-notif-tab"
            title="Thông báo"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-2 w-4 h-4 bg-red-500 border border-slate-900 text-[8px] font-bold text-white flex items-center justify-center rounded-full">
                {unreadCount}
              </span>
            )}
            <span className="text-[9px] mt-0.5 font-medium">Tin báo</span>
          </button>

          {/* Settings Tab */}
          <button 
            onClick={() => changeScreen("settings")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "settings" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-settings-tab"
            title="Cấu hình"
          >
            <Settings size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Cài đặt</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-slate-950 font-sans">
      
      {/* Reduced visual distraction: single highly muted ambient glow that aligns with the selected theme color */}
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full ${theme.glow} opacity-35 blur-[120px] pointer-events-none`}></div>

      {/* Decorative Branding Frame Title for Web View */}
      <div className="text-center mb-4 z-10 select-none">
        <h1 className="text-2xl font-extrabold tracking-tight font-display text-white flex items-center justify-center gap-2">
          <Shield className={`${theme.text} fill-white/5`} size={24} /> Aegis OS
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Trợ Lý Ảo Đa Năng Quản Trị Hệ Thống Cá Nhân • Glassmorphic Android Engine
        </p>
      </div>

      {/* Android Mobile Phone Enclosure Mockup */}
      <div className="relative w-full max-w-sm h-[740px] rounded-[40px] border-4 border-white/15 bg-slate-950/45 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-10">
        
        {/* Dynamic Glass Highlight reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none"></div>

        {/* Top Camera Notch & Speaker Grill */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-b-2xl border-x border-b border-white/5 flex items-center justify-center gap-1.5 z-50">
          <div className={`w-1.5 h-1.5 rounded-full ${theme.bg} opacity-80 animate-pulse`}></div>
          <div className="w-12 h-1 bg-white/10 rounded-full"></div>
        </div>

        {/* Phone Top Status Bar */}
        <div className="h-10 px-6 pt-2 flex items-end justify-between text-xs text-slate-300 font-medium select-none z-40">
          <div className="flex items-center gap-1">
            <Clock size={12} className={`${theme.text} opacity-80`} />
            <span className="font-mono text-[11px]">{phoneTime || "08:30"}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Wifi size={13} className="text-slate-300" />
            <span className={`text-[10px] font-mono font-semibold ${theme.text}`}>5G</span>
            <Battery size={14} className="text-emerald-400" />
          </div>
        </div>

        {/* Active Screen Area with Custom Smooth Animation Transitions */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 no-scrollbar z-30">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className="h-full transform-gpu"
            >
              {renderScreenContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Phone Bottom Navigation Bar with Glassmorphism */}
        <div className="h-16 px-4 pb-2 glass-panel border-t border-white/10 flex items-center justify-around z-40 select-none">
          {/* Home Tab */}
          <button 
            onClick={() => setScreen("home")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "home" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-home-tab"
            title="Tổng hợp"
          >
            <Home size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Home</span>
          </button>

          {/* Tasks Tab */}
          <button 
            onClick={() => setScreen("tasks")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "tasks" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-tasks-tab"
            title="Công việc"
          >
            <CheckSquare size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Tasks</span>
          </button>

          {/* Server Tab */}
          <button 
            onClick={() => setScreen("server")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "server" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-server-tab"
            title="Giám sát máy chủ"
          >
            <Server size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Uptime</span>
          </button>

          {/* Assistant Chat Tab */}
          <button 
            onClick={() => setScreen("chat")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "chat" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-chat-tab"
            title="Trò chuyện AI"
          >
            <MessageSquare size={18} className={screen === "chat" ? "" : "animate-pulse"} />
            <span className="text-[9px] mt-0.5 font-medium">Trợ lý</span>
          </button>

          {/* Notifications Tab */}
          <button 
            onClick={() => setScreen("notifications")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer relative ${screen === "notifications" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-notif-tab"
            title="Thông báo"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-2 w-4 h-4 bg-red-500 border border-slate-900 text-[8px] font-bold text-white flex items-center justify-center rounded-full">
                {unreadCount}
              </span>
            )}
            <span className="text-[9px] mt-0.5 font-medium">Tin báo</span>
          </button>

          {/* Settings Tab */}
          <button 
            onClick={() => setScreen("settings")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition cursor-pointer ${screen === "settings" ? `${theme.text} bg-white/5` : "text-slate-400 hover:text-white"}`}
            id="nav-settings-tab"
            title="Cấu hình"
          >
            <Settings size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Cài đặt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
