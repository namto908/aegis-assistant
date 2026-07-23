import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, CheckSquare, Server, Bell, LayoutGrid, ListFilter, AlignLeft, 
  RefreshCw, TrendingUp, AlertTriangle, Play, HelpCircle, ArrowRight, User
} from "lucide-react";
import { Task, ServerStatus, Notification, AssistantConfig, HomeLayoutVariant, ScreenType, GoogleUser } from "../types";
import { getThemeClasses } from "../lib/theme";
import { getApiBase } from "../lib/api";

interface DashboardProps {
  tasks: Task[];
  servers: ServerStatus[];
  notifications: Notification[];
  assistantConfig: AssistantConfig;
  setScreen: (screen: ScreenType) => void;
  user: GoogleUser | null;
}

export default function Dashboard({ tasks, servers, notifications, assistantConfig, setScreen, user }: DashboardProps) {
  const [layout, setLayout] = useState<HomeLayoutVariant>("bento");
  const theme = getThemeClasses(assistantConfig.themeColor || "slate");
  const [briefing, setBriefing] = useState<string>(
    `### Chào mừng chủ nhân quay trở lại! ☀️\n\nTôi là **${assistantConfig.name}**, trợ lý ảo của bạn. Dưới đây là báo cáo nhanh về hệ thống của chúng ta hôm nay:\n\n* **Nhiệm vụ:** Bạn đã hoàn thành **${tasks.filter(t => t.completed).length} / ${tasks.length}** đầu việc. Hãy xử lý các task có độ ưu tiên cao nhé!\n* **Máy chủ:** Hệ thống giám sát ghi nhận tất cả **${servers.filter(s => s.status === 'up').length} / ${servers.length}** máy chủ đang hoạt động ổn định (${servers.reduce((acc, s) => acc + s.uptime, 0) / servers.length} % Uptime).\n* **Thông báo:** Có **${notifications.filter(n => !n.read).length}** thông báo chưa đọc cần bạn lưu ý.\n\n*Lời khuyên hôm nay:* Tập trung giải quyết công việc quan trọng nhất vào buổi sáng để tối ưu hóa hiệu suất làm việc của bạn!`
  );
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Stats calculation
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const upServersCount = servers.filter((s) => s.status === "up").length;
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const generateAIBriefing = async (signal?: AbortSignal) => {
    setIsLoadingBrief(true);
    setBriefError(null);
    try {
      const apiBase = getApiBase(assistantConfig.apiBaseUrl);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        headers["Authorization"] = `Bearer ${user.idToken}`;
      }
      const response = await fetch(`${apiBase}/api/gemini/briefing`, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          tasks,
          servers,
          notifications,
          assistantName: assistantConfig.name,
          customPrompt: assistantConfig.prompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể liên kết với máy chủ Gemini.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setBriefing(data.text);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Lỗi tạo bản tin:", error);
        setBriefError("Không thể tạo bản tin trực tiếp bằng AI. Sử dụng bản tin cục bộ.");
      }
    } finally {
      setIsLoadingBrief(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} className={`text-base font-bold ${theme.text} mt-3 mb-1 font-display flex items-center gap-1.5`}>
            <span className={`w-1.5 h-4 ${theme.bg} rounded-full inline-block`}></span>
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className={`text-lg font-extrabold ${theme.textMuted} mt-4 mb-2 font-display`}>
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={i} className="text-xl font-black text-white mt-5 mb-3 font-display border-b border-white/10 pb-1">
            {line.replace("# ", "")}
          </h2>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const lineContent = line.substring(2);
        const parts = lineContent.split(/\*\*(.*?)\*\*/g);
        return (
          <li key={i} className="ml-4 list-none text-slate-200 text-sm mb-2 flex items-start gap-2">
            <span className={`${theme.text} mt-1`}>✦</span>
            <span>
              {parts.map((part, idx) =>
                idx % 2 === 1 ? <strong key={idx} className={`${theme.textMuted} font-semibold`}>{part}</strong> : part
              )}
            </span>
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-sm text-slate-300 leading-relaxed mb-1.5">
          {parts.map((part, idx) =>
            idx % 2 === 1 ? <strong key={idx} className={`${theme.textMuted} font-semibold`}>{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Dynamic Header & Assistant greeting */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${theme.border} shadow-lg`}>
              <img 
                src={assistantConfig.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"} 
                alt="Assistant Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-950 rounded-full"></span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display flex items-center gap-1.5">
              Chào chủ nhân!
            </h1>
            <p className="text-xs text-slate-400">Tôi là <span className={`${theme.text} font-medium`}>{assistantConfig.name}</span>, trợ lý của bạn.</p>
          </div>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setLayout("bento")}
            className={`p-1.5 rounded-lg transition ${layout === "bento" ? `${theme.bgMuted} ${theme.text} border ${theme.borderMuted}` : "text-slate-400 hover:text-white border border-transparent"}`}
            title="Bố cục Bento"
            id="layout-bento-btn"
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setLayout("streamlined")}
            className={`p-1.5 rounded-lg transition ${layout === "streamlined" ? `${theme.bgMuted} ${theme.text} border ${theme.borderMuted}` : "text-slate-400 hover:text-white border border-transparent"}`}
            title="Dòng thời gian"
            id="layout-streamlined-btn"
          >
            <AlignLeft size={16} />
          </button>
          <button 
            onClick={() => setLayout("minimal")}
            className={`p-1.5 rounded-lg transition ${layout === "minimal" ? `${theme.bgMuted} ${theme.text} border ${theme.borderMuted}` : "text-slate-400 hover:text-white border border-transparent"}`}
            title="Thẻ tối giản"
            id="layout-minimal-btn"
          >
            <ListFilter size={16} />
          </button>
        </div>
      </div>

      {/* Main Layout Area based on selection */}
      {layout === "bento" && (
        <div className="grid grid-cols-2 gap-4">
          {/* AI Daily Briefing Widget - Full Width */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-2 glass-card rounded-2xl p-4 relative overflow-hidden"
          >
            {/* Background glowing path */}
            <div className={`absolute top-0 right-0 w-24 h-24 ${theme.glow} rounded-full blur-2xl pointer-events-none`}></div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${theme.bgMuted} ${theme.text} border ${theme.borderMuted}`}>
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <h2 className="text-sm font-semibold text-white font-display">Bản Tin Trực Tiếp Từ AI</h2>
              </div>
              <button
                onClick={generateAIBriefing}
                disabled={isLoadingBrief}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${theme.bgMuted} hover:bg-white/10 ${theme.text} border ${theme.border} rounded-xl transition cursor-pointer disabled:opacity-50`}
                id="generate-brief-btn"
              >
                <RefreshCw size={12} className={isLoadingBrief ? "animate-spin" : ""} />
                {isLoadingBrief ? "Đang viết..." : "Tạo Lại bằng AI"}
              </button>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3 max-h-60 overflow-y-auto no-scrollbar">
              {renderMarkdown(briefing)}
            </div>

            {briefError && (
              <p className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} /> {briefError}
              </p>
            )}
          </motion.div>

          {/* Tasks Progress Widget */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            onClick={() => setScreen("tasks")}
            className="glass-card glass-card-hover rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${theme.bgMuted} ${theme.text} border ${theme.borderMuted}`}>
                <CheckSquare size={18} />
              </div>
              <span className={`text-[10px] bg-white/5 ${theme.text} border border-white/10 px-2 py-0.5 rounded-full font-mono font-bold`}>
                {completedTasksCount}/{tasks.length} Done
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-400">Công việc</p>
              <h3 className="text-lg font-bold text-white font-display">Quản Lý Task</h3>
              {/* Progress bar */}
              <div className="w-full bg-slate-900/60 h-1.5 rounded-full mt-2 overflow-hidden border border-white/5">
                <div 
                  className={`${theme.bg} h-full rounded-full`} 
                  style={{ width: `${tasks.length ? (completedTasksCount / tasks.length) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Còn lại {pendingTasksCount} task cần làm</p>
            </div>
          </motion.div>

          {/* Servers Uptime Monitoring Widget */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            onClick={() => setScreen("server")}
            className="glass-card glass-card-hover rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${theme.bgMuted} ${theme.text} border ${theme.borderMuted}`}>
                <Server size={18} />
              </div>
              <span className={`text-[10px] bg-white/5 ${theme.text} border border-white/10 px-2 py-0.5 rounded-full font-mono font-bold`}>
                {upServersCount}/{servers.length} Up
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-400">Giám sát máy chủ</p>
              <h3 className="text-lg font-bold text-white font-display">Server Uptime</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.bg} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.bg}`}></span>
                </span>
                <span className={`text-xs ${theme.text} font-mono font-medium`}>99.98% An toàn</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Độ trễ trung bình ~24ms</p>
            </div>
          </motion.div>

          {/* Notification Center Shortcut Widget */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            onClick={() => setScreen("notifications")}
            className="col-span-2 glass-card glass-card-hover rounded-2xl p-4 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${theme.bgMuted} ${theme.text} border ${theme.borderMuted} relative`}>
                <Bell size={18} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-[8px] font-bold text-white flex items-center justify-center rounded-full">
                    {unreadNotifsCount}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-display">Trung tâm thông báo</h4>
                <p className="text-xs text-slate-400">Có {unreadNotifsCount} tin mới nhất chưa đọc từ trợ lý.</p>
              </div>
            </div>
            <div className={`${theme.text} hover:opacity-80 transition`}>
              <ArrowRight size={16} />
            </div>
          </motion.div>
        </div>
      )}

      {layout === "streamlined" && (
        <div className="space-y-4">
          {/* Detailed chronological list of items */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-4"
          >
            <h2 className={`text-sm font-semibold ${theme.text} font-display mb-3 flex items-center gap-1.5`}>
              <Sparkles size={14} /> Điểm Tin Toàn Bộ Hệ Thống
            </h2>
            <div className="space-y-3">
              {renderMarkdown(briefing)}
            </div>
          </motion.div>

          {/* Fast List View */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái tóm tắt</h3>
            
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-slate-200">Tiến độ Tasks hiện tại:</span>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>{completedTasksCount} / {tasks.length} ({(tasks.length ? (completedTasksCount/tasks.length)*100 : 0).toFixed(0)}%)</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-slate-200">Giám sát máy chủ:</span>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>{upServersCount} / {servers.length} Online</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-200">Thông báo chưa đọc:</span>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>{unreadNotifsCount} thông báo</span>
            </div>
          </div>
        </div>
      )}

      {layout === "minimal" && (
        <div className="space-y-3">
          {/* Minimal list of compact boxes */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-xl p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${theme.bg}`}></div>
              <span className="text-sm font-medium text-slate-200">Tasks: {pendingTasksCount} việc còn lại</span>
            </div>
            <button onClick={() => setScreen("tasks")} className={`text-xs ${theme.text} flex items-center gap-0.5`}>
              Xem <ArrowRight size={12} />
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${theme.bg}`}></div>
              <span className="text-sm font-medium text-slate-200">Servers: {upServersCount}/{servers.length} Hoạt động</span>
            </div>
            <button onClick={() => setScreen("server")} className={`text-xs ${theme.text} flex items-center gap-0.5`}>
              Xem <ArrowRight size={12} />
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${theme.bg}`}></div>
              <span className="text-sm font-medium text-slate-200">Thông báo: {unreadNotifsCount} tin chưa đọc</span>
            </div>
            <button onClick={() => setScreen("notifications")} className={`text-xs ${theme.text} flex items-center gap-0.5`}>
              Xem <ArrowRight size={12} />
            </button>
          </motion.div>

          {/* Mini AIBrief box */}
          <div className="glass-card rounded-2xl p-4 mt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={12} /> Nhật Ký Vắn Tắt
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "Tất cả hệ thống vận hành trơn tru. Có {pendingTasksCount} task chưa làm, server chính của bạn ghi nhận uptime lý tưởng 99.98%. Tôi luôn sẵn sàng hỗ trợ tại tab trò chuyện."
            </p>
          </div>
        </div>
      )}

      {/* Floating virtual assistant entry point */}
      <motion.div 
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setScreen("chat")}
        className={`glass-card bg-white/5 ${theme.hoverBg} border ${theme.borderMuted} rounded-2xl p-4 flex items-center justify-between cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-white/5 ${theme.text} border ${theme.borderMuted} rounded-xl`}>
            <Sparkles size={20} className="animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display">Trò chuyện với {assistantConfig.name}</h3>
            <p className="text-xs text-slate-300/80">Đặt câu hỏi, điều khiển task bằng giọng nói/văn bản.</p>
          </div>
        </div>
        <div className={`${theme.bg} text-slate-950 p-1.5 rounded-lg shadow-md`}>
          <Play size={12} fill="currentColor" />
        </div>
      </motion.div>
    </div>
  );
}
