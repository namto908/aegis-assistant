import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { 
  Bell, Check, Trash2, CheckSquare, Server, 
  Terminal, Sparkles, Inbox, Newspaper, Clock, 
  ExternalLink, X, ChevronRight, Calendar, RefreshCw 
} from "lucide-react";
import type { Notification, ThemeColor, Task, ServerStatus } from "../types";
import { getThemeClasses } from "../lib/theme";

interface NotificationsCenterProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  themeColor?: ThemeColor;
  tasks?: Task[];
  servers?: ServerStatus[];
  setScreen?: React.Dispatch<React.SetStateAction<any>>;
  onDiscussWithChatbot?: (message: string) => void;
  apiBaseUrl?: string;
}

export default function NotificationsCenter({ 
  notifications, 
  setNotifications, 
  themeColor = "slate",
  tasks = [],
  servers = [],
  setScreen,
  onDiscussWithChatbot,
  apiBaseUrl
}: NotificationsCenterProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  
  // Custom Scheduler State & LocalStorage Persistence
  const [scheduleTime, setScheduleTime] = useState<string>(() => {
    return localStorage.getItem("aegis_news_time") || "07:00";
  });
  const [topic, setTopic] = useState<"hacker-news" | "ai-news" | "system-summary" | "custom">(() => {
    return (localStorage.getItem("aegis_news_topic") as any) || "hacker-news";
  });
  const [customTopic, setCustomTopic] = useState<string>(() => {
    return localStorage.getItem("aegis_news_custom_topic") || "Trí tuệ nhân tạo, Máy chủ Linux & Android 16";
  });
  const [isCronEnabled, setIsCronEnabled] = useState<boolean>(() => {
    const val = localStorage.getItem("aegis_news_cron");
    return val === null ? true : val === "true";
  });

  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [selectedNews, setSelectedNews] = useState<Notification | null>(null);

  const theme = getThemeClasses(themeColor);

  // Save Preferences to LocalStorage
  useEffect(() => {
    localStorage.setItem("aegis_news_time", scheduleTime);
    localStorage.setItem("aegis_news_topic", topic);
    localStorage.setItem("aegis_news_custom_topic", customTopic);
    localStorage.setItem("aegis_news_cron", String(isCronEnabled));
  }, [scheduleTime, topic, customTopic, isCronEnabled]);

  // Push Native Device System Notification
  const sendDeviceNotification = async (title: string, body: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display === "granted") {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: `📰 ${title}`,
                body: body,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: new Date(Date.now() + 500) },
                sound: undefined,
                actionTypeId: "",
                extra: null
              }
            ]
          });
        }
      } else if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(`📰 ${title}`, { body });
        } else if (Notification.permission !== "denied") {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            new Notification(`📰 ${title}`, { body });
          }
        }
      }
    } catch (e) {
      console.log("Device notification error:", e);
    }
  };

  // Background Time Check Scheduler Loop
  useEffect(() => {
    if (!isCronEnabled) return;

    const checkScheduler = () => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const lastPushedDate = localStorage.getItem("aegis_last_pushed_date");
      const todayStr = now.toDateString();

      if (currentHHMM === scheduleTime && lastPushedDate !== todayStr && !loading) {
        localStorage.setItem("aegis_last_pushed_date", todayStr);
        triggerNewsPush();
      }
    };

    const interval = setInterval(checkScheduler, 15000);
    return () => clearInterval(interval);
  }, [isCronEnabled, scheduleTime, loading, topic, customTopic]);

  const markAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const deleteNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const getCategoryStyles = (category: "task" | "server" | "system" | "news") => {
    switch (category) {
      case "task":
        return {
          icon: <CheckSquare size={14} />,
          bg: `${theme.bgMuted} ${theme.text} ${theme.borderMuted}`,
          label: "Nhiệm vụ",
        };
      case "server":
        return {
          icon: <Server size={14} />,
          bg: `${theme.bgMuted} ${theme.text} ${theme.borderMuted}`,
          label: "Máy chủ",
        };
      case "system":
        return {
          icon: <Terminal size={14} />,
          bg: `${theme.bgMuted} ${theme.text} ${theme.borderMuted}`,
          label: "Hệ thống",
        };
      case "news":
        return {
          icon: <Newspaper size={14} />,
          bg: `${theme.bgMuted} ${theme.text} ${theme.borderMuted}`,
          label: "Bản tin sáng",
        };
    }
  };

  const getBorderColor = (color: ThemeColor, category?: string) => {
    switch (color) {
      case "rose": return "border-l-rose-500";
      case "emerald": return "border-l-emerald-500";
      case "amber": return "border-l-amber-500";
      case "purple": return "border-l-purple-500";
      case "blue": return "border-l-blue-500";
      case "slate": return "border-l-slate-500";
      default: return "border-l-cyan-500";
    }
  };

  const triggerNewsPush = async (inputSignal?: AbortSignal) => {
    const signal = (inputSignal instanceof AbortSignal) ? inputSignal : undefined;
    setLoading(true);
    const apiBase = (apiBaseUrl && apiBaseUrl.trim() !== "") ? apiBaseUrl.replace(/\/$/, "") : "http://192.168.2.200:3000";
    const targetUrl = `${apiBase}/api/gemini/news`;

    setLoadingLogs([
      `🚀 Khởi chạy tác vụ đẩy bản tin (${scheduleTime})...`,
      `🌐 API Target: ${targetUrl}`
    ]);
    
    setTimeout(() => {
      setLoadingLogs((prev) => [...prev, "Khởi động phiên kết nối Gemini AI (Việt Nam UTC+7)..."]);
    }, 400);

    setTimeout(() => {
      setLoadingLogs((prev) => [...prev, topic === "system-summary" ? "Thu thập dữ liệu trạng thái máy chủ & công việc Aegis..." : "Đang tìm kiếm tin tức mới nhất qua Google Search Grounding..."]);
    }, 800);

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          topic,
          customTopic,
          tasks,
          servers
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || `Lỗi HTTP ${response.status} từ máy chủ.`);
      }
      
      setLoadingLogs((prev) => [...prev, "✨ Đã tổng hợp bài viết chi tiết, đang hoàn tất..."]);

      setTimeout(() => {
        const notifTitle = data.title || "Bản tin công nghệ Aegis mới nhất";
        const notifDesc = data.description || "Cập nhật mới nhất từ hệ thống AI";

        const newNotif: Notification = {
          id: "news_" + Date.now(),
          title: notifTitle,
          description: notifDesc,
          category: "news",
          read: false,
          timestamp: scheduleTime,
          contentDetail: data.contentDetail,
          sourceUrl: data.sourceUrl
        };
        
        setNotifications((prev) => [newNotif, ...prev]);
        setSelectedNews(newNotif);
        setLoading(false);
        setLoadingLogs([]);

        // Fire native system notification bar alert
        sendDeviceNotification(notifTitle, notifDesc);
      }, 600);

    } catch (err: any) {
      console.error("Failed to generate newsletter", err);
      const errMsg = err?.message || String(err);
      setLoadingLogs((prev) => [...prev, `❌ Lỗi: ${errMsg}`]);
      // Keep error log box visible for inspection
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, index) => {
      if (line.startsWith("## ")) {
        return <h2 key={index} className="text-sm font-bold text-white mt-4 mb-2 first:mt-0 font-display">{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={index} className="text-xs font-semibold text-slate-200 mt-3 mb-1 font-display">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("* ") || line.startsWith("- ")) {
        const cleanLine = line.replace(/^[\*\-]\s+/, "");
        return <li key={index} className="text-xs text-slate-300 ml-4 list-disc my-1">{cleanLine}</li>;
      }
      if (line.trim() === "---") {
        return <hr key={index} className="border-white/10 my-4" />;
      }
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      let formattedLine: React.ReactNode = line;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        formattedLine = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part);
      }
      return <p key={index} className="text-xs text-slate-400 leading-relaxed my-1.5 min-h-[4px]">{formattedLine}</p>;
    });
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  return (
    <div className="space-y-4 pb-20 relative h-full flex flex-col min-h-0 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Trung tâm thông báo</h1>
          <p className="text-xs text-slate-400">Quản lý lịch đẩy bản tin & thông báo hệ thống</p>
        </div>
        <div className="flex gap-1.5">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition text-xs flex items-center gap-1 cursor-pointer border border-white/5"
                title="Đánh dấu tất cả là đã đọc"
              >
                <Check size={14} />
                <span className="hidden sm:inline">Đã đọc</span>
              </button>
              <button
                onClick={clearAllNotifications}
                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 rounded-lg transition text-xs flex items-center gap-1 cursor-pointer border border-rose-500/20"
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Xóa hết</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Customizable Daily News Scheduler Card */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 bg-slate-900/60 relative space-y-3 shrink-0 shadow-xl">
        <div className={`absolute top-0 right-0 w-24 h-24 ${theme.glow} rounded-full blur-xl pointer-events-none`}></div>

        {/* Card Header & Cron Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 ${theme.bgMuted} ${theme.text} rounded-lg border ${theme.borderMuted}`}>
              <Newspaper size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-display">Tùy chỉnh Lập lịch Đẩy Bản tin</h3>
              <p className="text-[10px] text-slate-400">Đẩy thông báo hệ thống ngoài màn hình</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCronEnabled(!isCronEnabled)}
            className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1 cursor-pointer transition font-bold ${
              isCronEnabled 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 animate-pulse" 
                : "bg-slate-800/80 border-slate-700 text-slate-400"
            }`}
          >
            <Clock size={11} />
            <span>{isCronEnabled ? "Đang bật lịch" : "Đã tắt lịch"}</span>
          </button>
        </div>

        {/* Time Picker & Timezone Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giờ đẩy bản tin:</label>
            <input 
              type="time" 
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className={`bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:${theme.border} transition cursor-pointer`}
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span className={`w-2 h-2 rounded-full ${isCronEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}></span>
            <span>{isCronEnabled ? `● Lịch chạy: ${scheduleTime} hằng ngày (UTC+7)` : "● Đã tạm dừng đẩy tự động"}</span>
          </div>
        </div>

        {/* Topic selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Chủ đề sở thích cá nhân</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "hacker-news", label: "Hacker News", desc: "Tin công nghệ toàn cầu" },
              { id: "ai-news", label: "Tin tức AI & LLM", desc: "Xu hướng Gemini/GPT" },
              { id: "system-summary", label: "Aegis System", desc: "Báo cáo máy chủ & task" },
              { id: "custom", label: "Tùy chỉnh riêng", desc: "Nhập sở thích cá nhân" }
            ].map((s) => (
              <button
                key={s.id}
                disabled={loading}
                onClick={() => setTopic(s.id as any)}
                className={`p-2 rounded-xl text-left border cursor-pointer transition flex flex-col justify-between ${
                  topic === s.id 
                    ? `${theme.bgMuted} ${theme.border} text-white ${theme.shadow}` 
                    : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-[10px] font-bold block truncate">{s.label}</span>
                <span className="text-[8px] opacity-75">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom topic prompt input field */}
        {topic === "custom" && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-155">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Sở thích cá nhân / Từ khóa đẩy tin</label>
            <textarea 
              rows={2}
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Nhập sở thích của bạn. Ví dụ: Tin nóng Bitcoin, Trí tuệ nhân tạo, Máy chủ Linux Nginx, Android 16..."
              className={`w-full bg-slate-950/70 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:${theme.border} transition font-sans resize-none`}
              disabled={loading}
            />
          </div>
        )}

        {/* Action Button & Scrollable Log Display Box */}
        {loading ? (
          <div className="space-y-2 p-3 bg-slate-950/90 rounded-xl border border-white/10 shadow-2xl">
            <div className={`flex items-center justify-between text-xs font-bold ${theme.text}`}>
              <div className="flex items-center gap-2">
                <RefreshCw size={12} className={`animate-spin ${theme.text}`} />
                <span>Đang xử lý & đẩy bản tin ({scheduleTime})...</span>
              </div>
              <button 
                onClick={() => { setLoading(false); setLoadingLogs([]); }}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer font-sans"
              >
                Đóng log
              </button>
            </div>

            {/* Scrollable, Un-clipped Log Output Container */}
            <div className="space-y-1.5 p-2.5 bg-black/80 rounded-lg font-mono text-[10px] text-slate-300 border border-white/10 max-h-56 overflow-y-auto break-all whitespace-pre-wrap select-text leading-relaxed">
              {loadingLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-1.5 border-b border-white/5 pb-1 last:border-none">
                  <span className={`${log.includes("❌") ? "text-rose-400 font-bold" : theme.text} select-none shrink-0`}>›</span>
                  <span className={log.includes("❌") ? "text-rose-300 font-semibold" : "text-slate-300"}>{log}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => triggerNewsPush()}
            className={`w-full py-2.5 ${theme.bgMuted} hover:bg-white/10 ${theme.text} hover:text-white rounded-xl transition text-xs font-bold border ${theme.borderMuted} flex items-center justify-center gap-1.5 cursor-pointer shadow-lg`}
          >
            <Sparkles size={13} className="animate-pulse" />
            <span>⚡ Đẩy bản tin ngay lập tức (Giờ: {scheduleTime})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs rounded-xl transition border cursor-pointer ${filter === "all" ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text}` : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 text-xs rounded-xl transition border cursor-pointer ${filter === "unread" ? "bg-amber-500/20 border-amber-500/40 text-amber-200" : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Chưa đọc ({notifications.filter((n) => !n.read).length})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3 min-h-[150px]">
        {filteredNotifs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Inbox size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Hộp thư trống.</p>
              <p className="text-xs text-slate-500">Các bản tin và thông báo hệ thống được đẩy sẽ xuất hiện tại đây.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredNotifs.map((notif) => {
              const style = getCategoryStyles(notif.category);
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={(e) => {
                    markAsRead(notif.id, e);
                    if (notif.category === "news") {
                      setSelectedNews(notif);
                    }
                  }}
                  className={`glass-card rounded-2xl p-3.5 border-l-4 transition-all duration-200 cursor-pointer ${
                    notif.read 
                      ? "border-l-slate-700 bg-slate-950/20 opacity-40 hover:opacity-70 scale-[0.99] border-t-transparent border-r-transparent border-b-transparent" 
                      : `${getBorderColor(themeColor, notif.category)} bg-white/5 border-t border-r border-b border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.03)] hover:bg-white/8 hover:scale-[1.01]`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl flex-shrink-0 border transition-all duration-200 ${
                      notif.read 
                        ? "bg-slate-950/40 text-slate-600 border-slate-900/50" 
                        : `${style.bg}`
                    }`}>
                      {style.icon}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-mono font-bold tracking-wide uppercase transition-colors ${
                          notif.read ? "text-slate-600" : "text-slate-400"
                        }`}>
                          {style.label}
                        </span>
                        <span className={`text-[10px] font-mono transition-colors ${
                          notif.read ? "text-slate-600" : "text-slate-500"
                        }`}>
                          {notif.timestamp}
                        </span>
                      </div>
                      
                      <h3 className={`text-sm font-semibold truncate transition-colors ${
                        notif.read ? "text-slate-500" : "text-white font-medium"
                      }`}>
                        {notif.title}
                      </h3>
                      <p className={`text-xs leading-relaxed break-words transition-colors ${
                        notif.read ? "text-slate-600" : "text-slate-300"
                      }`}>
                        {notif.description}
                      </p>

                      {notif.category === "news" && (
                        <div className={`pt-1.5 flex items-center gap-1 text-[10px] ${theme.text} font-bold hover:opacity-80`}>
                          <span>Chi tiết bản tin</span>
                          <ChevronRight size={10} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-between self-stretch pl-2">
                      <div>
                        {!notif.read && (
                          <span className={`w-2 h-2 ${theme.bg} rounded-full animate-pulse block`} title="Tin nhắn mới"></span>
                        )}
                      </div>
                      <button
                        onClick={(e) => deleteNotification(notif.id, e)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/5 transition cursor-pointer"
                        title="Xóa thông báo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Sliding Detailed News Panel Overlay */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-50 flex flex-col p-5 overflow-y-auto no-scrollbar rounded-t-[32px] border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className={`flex items-center gap-2 ${theme.text}`}>
                <Newspaper size={15} />
                <span className="text-[10px] font-mono font-bold tracking-wide uppercase">BẢN TIN CHI TIẾT ({selectedNews.timestamp})</span>
              </div>
              <button 
                onClick={() => setSelectedNews(null)}
                className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition cursor-pointer border border-white/5"
              >
                <X size={15} />
              </button>
            </div>

            {/* Title & Metadata */}
            <div className="mt-4 space-y-2">
              <h1 className="text-base font-bold text-white leading-snug font-display">{selectedNews.title}</h1>
              <div className="flex items-center gap-3 text-[9px] text-slate-500 font-mono">
                <span className="flex items-center gap-1"><Clock size={10} /> Hôm nay, {selectedNews.timestamp}</span>
                {selectedNews.sourceUrl && (
                  <span className="flex items-center gap-1">
                    <Calendar size={10} /> 
                    {(() => {
                      try {
                        return new URL(selectedNews.sourceUrl).hostname;
                      } catch {
                        return "news.google.com";
                      }
                    })()}
                  </span>
                )}
              </div>
            </div>

            {/* Detailed Body */}
            <div className="mt-4 space-y-3 flex-1 pb-10">
              {selectedNews.contentDetail ? renderMarkdown(selectedNews.contentDetail) : (
                <p className="text-xs text-slate-300 leading-relaxed">{selectedNews.description}</p>
              )}
              
              <div className="pt-4 flex flex-wrap gap-2">
                {selectedNews.sourceUrl && (
                  <a 
                    href={selectedNews.sourceUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${theme.bgMuted} ${theme.text} border ${theme.borderMuted} hover:bg-white/10 transition cursor-pointer`}
                  >
                    <ExternalLink size={12} /> Đọc tin tức gốc
                  </a>
                )}
                {onDiscussWithChatbot && (
                  <button
                    onClick={() => {
                      const chatMessage = `Hãy phân tích chi tiết hơn về bản tin sau:\n\n**Tiêu đề:** ${selectedNews.title}\n**Tóm tắt:** ${selectedNews.description}\n\n**Chi tiết bản tin:**\n${selectedNews.contentDetail || ""}\n\nHãy tóm tắt thêm và đưa ra các câu hỏi, phân tích hoặc góc nhìn công nghệ sâu sắc về bản tin này nhé!`;
                      onDiscussWithChatbot(chatMessage);
                      setSelectedNews(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${theme.bgMuted} ${theme.text} border ${theme.borderMuted} hover:bg-white/10 transition cursor-pointer`}
                  >
                    Hỏi đáp qua Chatbot
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
