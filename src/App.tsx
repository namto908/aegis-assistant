import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { 
  Home, CheckSquare, Bell, Server, MessageSquare, Settings, 
  Wifi, Battery, Shield, Sparkles, Clock, Smartphone, Info,
  LogIn, LogOut, User, Key
} from "lucide-react";
import { Task, ServerStatus, Notification, AssistantConfig, ScreenType, GoogleUser } from "./types";
import { getThemeClasses } from "./lib/theme";
import { getApiBase } from "./lib/api";
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
  themeColor: "slate",
  apiBaseUrl: "http://192.168.2.200:25530"
};

export default function App() {
  const [user, setUser] = useState<GoogleUser | null>(null);

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
  const prevTasksRef = useRef<Task[]>([]);
  const prevServersRef = useRef<ServerStatus[]>([]);
  const prevNotificationsRef = useRef<Notification[]>([]);

  const apiBase = getApiBase(assistantConfig.apiBaseUrl);

  const changeScreen = (newScreen: ScreenType) => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 120) return;
    lastNavTimeRef.current = now;

    if (newScreen === screen) return;
    setScreen(newScreen);
    setScreenHistory((prev) => [...prev, newScreen]);
  };

  const fetchUserData = async (usr: GoogleUser) => {
    try {
      const headers = {
        "Authorization": `Bearer ${usr.idToken}`
      };
      
      const configRes = await fetch(`${apiBase}/api/config`, { headers });
      if (configRes.ok) {
        const configData = await configRes.json();
        setAssistantConfig(configData);
      }
      
      const tasksRes = await fetch(`${apiBase}/api/tasks`, { headers });
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        prevTasksRef.current = tasksData;
        setTasks(tasksData);
      }
      
      const serversRes = await fetch(`${apiBase}/api/servers`, { headers });
      if (serversRes.ok) {
        const serversData = await serversRes.json();
        prevServersRef.current = serversData;
        setServers(serversData);
      }
      
      const notifsRes = await fetch(`${apiBase}/api/notifications`, { headers });
      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        prevNotificationsRef.current = notifsData;
        setNotifications(notifsData);
      }
    } catch (e) {
      console.error("Error fetching user data from backend:", e);
    }
  };

  useEffect(() => {
    try {
      GoogleAuth.initialize({
        clientId: '456986323375-qd087acsddmk1ich4mn6dv8vm1bs7mot.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    } catch (e) {
      console.warn("GoogleAuth init error:", e);
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const googleUser = await GoogleAuth.signIn();
      const mockUser: GoogleUser = {
        id: googleUser.id || `google_${googleUser.email}`,
        email: googleUser.email,
        name: googleUser.name || googleUser.givenName || "Google User",
        picture: googleUser.imageUrl,
        idToken: googleUser.authentication.idToken
      };
      localStorage.setItem("aegis_user", JSON.stringify(mockUser));
      setUser(mockUser);
      fetchUserData(mockUser);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err?.message !== "user Canceled" && err !== "user Canceled") {
        alert("Đăng nhập Google thất bại: " + (err?.message || err?.error || JSON.stringify(err)));
      }
    }
  };



  const handleLogout = () => {
    GoogleAuth.signOut().catch(() => {});
    localStorage.removeItem("aegis_user");
    localStorage.removeItem("aegis_tasks");
    localStorage.removeItem("aegis_servers");
    localStorage.removeItem("aegis_notifications");
    setUser(null);
    setTasks([]);
    setServers([]);
    setNotifications([]);
    setAssistantConfig(DEFAULT_ASSISTANT);
    setScreen("home");
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

  // Load User on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("aegis_user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchUserData(parsedUser);
      } else {
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

        if (storedAssistant) {
          const parsed = JSON.parse(storedAssistant);
          if (!parsed.apiBaseUrl) {
            parsed.apiBaseUrl = "http://192.168.2.200:25530";
          }
          setAssistantConfig(parsed);
        } else {
          setAssistantConfig(DEFAULT_ASSISTANT);
        }
      }
    } catch (e) {
      console.error("Local Storage Load Error:", e);
    }
  }, []);

  // Declarative Backend Sync Effects
  useEffect(() => {
    if (!user) return;
    const prev = prevTasksRef.current;
    if (prev.length === 0 && tasks.length === 0) {
      prevTasksRef.current = tasks;
      return;
    }
    
    const sync = async () => {
      const deleted = prev.filter(p => !tasks.some(t => t.id === p.id));
      for (const d of deleted) {
        await fetch(`${apiBase}/api/tasks/${d.id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.idToken}` }
        }).catch(err => console.error(err));
      }
      
      const addedOrUpdated = tasks.filter(t => {
        const p = prev.find(prevTask => prevTask.id === t.id);
        return !p || JSON.stringify(p) !== JSON.stringify(t);
      });
      for (const t of addedOrUpdated) {
        const p = prev.find(prevTask => prevTask.id === t.id);
        const method = p ? "PUT" : "POST";
        const url = p ? `${apiBase}/api/tasks/${t.id}` : `${apiBase}/api/tasks`;
        await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.idToken}`
          },
          body: JSON.stringify(t)
        }).catch(err => console.error(err));
      }
      prevTasksRef.current = tasks;
      localStorage.setItem("aegis_tasks", JSON.stringify(tasks));
    };
    
    sync();
  }, [tasks, user, apiBase]);

  useEffect(() => {
    if (!user) return;
    const prev = prevServersRef.current;
    if (prev.length === 0 && servers.length === 0) {
      prevServersRef.current = servers;
      return;
    }
    
    const sync = async () => {
      const deleted = prev.filter(p => !servers.some(s => s.id === p.id));
      for (const d of deleted) {
        await fetch(`${apiBase}/api/servers/${d.id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.idToken}` }
        }).catch(err => console.error(err));
      }
      
      const addedOrUpdated = servers.filter(s => {
        const p = prev.find(prevSrv => prevSrv.id === s.id);
        return !p || JSON.stringify(p) !== JSON.stringify(s);
      });
      for (const s of addedOrUpdated) {
        const p = prev.find(prevSrv => prevSrv.id === s.id);
        const method = p ? "PUT" : "POST";
        const url = p ? `${apiBase}/api/servers/${s.id}` : `${apiBase}/api/servers`;
        await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.idToken}`
          },
          body: JSON.stringify(s)
        }).catch(err => console.error(err));
      }
      prevServersRef.current = servers;
      localStorage.setItem("aegis_servers", JSON.stringify(servers));
    };
    
    sync();
  }, [servers, user, apiBase]);

  useEffect(() => {
    if (!user) return;
    const prev = prevNotificationsRef.current;
    if (prev.length === 0 && notifications.length === 0) {
      prevNotificationsRef.current = notifications;
      return;
    }
    
    const sync = async () => {
      const deleted = prev.filter(p => !notifications.some(n => n.id === p.id));
      for (const d of deleted) {
        await fetch(`${apiBase}/api/notifications/${d.id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.idToken}` }
        }).catch(err => console.error(err));
      }
      
      const addedOrUpdated = notifications.filter(n => {
        const p = prev.find(prevNotif => prevNotif.id === n.id);
        return !p || JSON.stringify(p) !== JSON.stringify(n);
      });
      for (const n of addedOrUpdated) {
        const p = prev.find(prevNotif => prevNotif.id === n.id);
        if (p) {
          if (n.read && !p.read) {
            await fetch(`${apiBase}/api/notifications/${n.id}/read`, {
              method: "PUT",
              headers: { "Authorization": `Bearer ${user.idToken}` }
            }).catch(err => console.error(err));
          }
        } else {
          await fetch(`${apiBase}/api/notifications`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${user.idToken}`
            },
            body: JSON.stringify(n)
          }).catch(err => console.error(err));
        }
      }
      prevNotificationsRef.current = notifications;
      localStorage.setItem("aegis_notifications", JSON.stringify(notifications));
    };
    
    sync();
  }, [notifications, user, apiBase]);

  useEffect(() => {
    if (!user) return;
    const syncConfig = async () => {
      try {
        await fetch(`${apiBase}/api/config`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.idToken}`
          },
          body: JSON.stringify(assistantConfig)
        });
      } catch (e) {
        console.error("Failed to sync assistant config to backend:", e);
      }
    };
    
    const timer = setTimeout(syncConfig, 1000);
    return () => clearTimeout(timer);
  }, [assistantConfig, user, apiBase]);

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
  const renderLoginScreen = () => {
    return (
      <div className="w-full max-w-sm p-8 rounded-[32px] border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-350 z-50">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.2)] animate-pulse">
            <Shield className="text-cyan-400 fill-cyan-400/10" size={36} />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center animate-bounce">
            <Sparkles size={10} className="text-slate-950" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">AEGIS ASSISTANT</h2>
          <p className="text-xs text-slate-400 max-w-[240px]">Hệ thống Trợ lý ảo & Bảo mật Quản trị Hệ thống Cá nhân</p>
        </div>

        <div className="w-full pt-2">
          {/* Primary Google Login Button */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full py-4 px-4 rounded-2xl border border-white/20 bg-gradient-to-r from-white/15 via-white/10 to-white/5 hover:from-white/20 hover:to-white/15 text-white font-bold text-sm shadow-2xl active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-3 group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.78 0 3.38.61 4.64 1.8l3.46-3.46C17.99 1.19 15.15 0 12 0 7.31 0 3.25 2.69 1.18 6.63l4.03 3.12C6.18 7.02 8.85 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.69 2.87c2.16-1.99 3.42-4.92 3.42-8.6z" />
              <path fill="#FBBC05" d="M5.21 14.77c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27L1.18 7.11C.43 8.58 0 10.24 0 12s.43 3.42 1.18 4.89l4.03-3.12z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.96 1.09-3.15 0-5.82-1.98-6.78-4.71L1.49 17.72C3.56 21.31 7.31 24 12 24z" />
            </svg>
            <span>Đăng nhập bằng Google</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 leading-relaxed max-w-[220px]">
          Xác thực an toàn tuyệt đối qua Google OAuth 2.0. Dữ liệu & Trí nhớ AI được bảo mật theo tài khoản.
        </p>
      </div>
    );
  };

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
            user={user}
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
            user={user}
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
            user={user}
          />
        );
      case "settings":
        return (
          <SettingsPanel 
            assistantConfig={assistantConfig} 
            setAssistantConfig={setAssistantConfig} 
            resetMockData={resetMockData}
            addNotification={addNotification}
            user={user}
            onLogout={handleLogout}
          />
        );
    }
  };

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    if (!user) {
      return (
        <div className="relative h-screen w-screen max-h-screen overflow-hidden flex flex-col bg-slate-950 font-sans select-none text-slate-100 items-center justify-center p-4">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-500/10 opacity-30 pointer-events-none transform-gpu"></div>
          {renderLoginScreen()}
        </div>
      );
    }

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

      {!user ? (
        <>
          <div className="text-center mb-4 z-10 select-none">
            <h1 className="text-2xl font-extrabold tracking-tight font-display text-white flex items-center justify-center gap-2">
              <Shield className={`${theme.text} fill-white/5`} size={24} /> Aegis OS
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Trợ Lý Ảo Đa Năng Quản Trị Hệ Thống Cá Nhân • Glassmorphic Android Engine
            </p>
          </div>
          {renderLoginScreen()}
        </>
      ) : (
        <>
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
            <div className="flex-1 overflow-y-auto px-5 pt-3 no-scrollbar z-30 flex flex-col min-h-0">
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
        </>
      )}
    </div>
  );
}
