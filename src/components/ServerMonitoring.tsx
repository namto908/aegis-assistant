import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Server, RefreshCw, AlertCircle, Activity, Globe, Wifi, 
  WifiOff, ArrowUpRight, TrendingUp, Zap, HelpCircle, HardDrive 
} from "lucide-react";
import { ServerStatus, Notification, ThemeColor } from "../types";
import { getThemeClasses } from "../lib/theme";

interface ServerMonitoringProps {
  servers: ServerStatus[];
  setServers: React.Dispatch<React.SetStateAction<ServerStatus[]>>;
  addNotification: (title: string, description: string, category: "task" | "server" | "system") => void;
  themeColor?: ThemeColor;
}

export default function ServerMonitoring({ servers, setServers, addNotification, themeColor = "slate" }: ServerMonitoringProps) {
  const [isPinging, setIsPinging] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString());
  const theme = getThemeClasses(themeColor);

  // Trigger manually ping test
  const triggerPingTest = () => {
    setIsPinging(true);
    setTimeout(() => {
      setServers((prevServers) =>
        prevServers.map((server) => {
          if (server.status === "down") return server; // Keep down servers down

          // Generate slightly randomized response time
          const baseLatency = server.name.includes("Production") ? 15 : server.name.includes("API") ? 22 : 35;
          const randomModifier = Math.floor(Math.random() * 12) - 5; // -5ms to +7ms
          const newLatency = Math.max(8, baseLatency + randomModifier);

          // Update response history
          const updatedHistory = [...server.history.slice(1), newLatency];

          return {
            ...server,
            latency: newLatency,
            history: updatedHistory,
            lastPing: new Date().toLocaleTimeString(),
          };
        })
      );
      setIsPinging(false);
      setLastCheckTime(new Date().toLocaleTimeString());
      addNotification(
        "Ping Check thành công",
        "Tất cả các máy chủ đang hoạt động đã phản hồi tín hiệu đo kiểm tra định kỳ.",
        "server"
      );
    }, 1200);
  };

  // Simulate Server Crash
  const toggleServerStatus = (id: string) => {
    setServers((prevServers) =>
      prevServers.map((server) => {
        if (server.id === id) {
          const isCrashing = server.status === "up";
          const updatedStatus = isCrashing ? "down" : "up";
          const updatedLatency = isCrashing ? 0 : 25;
          const updatedUptime = isCrashing 
            ? parseFloat(Math.max(85, server.uptime - 0.05).toFixed(2)) 
            : server.uptime;

          // Trigger background notification
          if (isCrashing) {
            addNotification(
              `CẢNH BÁO: Server sập!`,
              `Máy chủ ${server.name} (${server.url}) đã ngừng phản hồi tín hiệu! Độ trễ đo được là vô hạn.`,
              "server"
            );
          } else {
            addNotification(
              `KHÔI PHỤC: Server hoạt động`,
              `Máy chủ ${server.name} đã trực tuyến trở lại thành công. Tiến hành đồng bộ hóa dữ liệu.`,
              "server"
            );
          }

          return {
            ...server,
            status: updatedStatus,
            latency: updatedLatency,
            uptime: updatedUptime,
            lastPing: new Date().toLocaleTimeString(),
          };
        }
        return server;
      })
    );
  };

  // Sparkline generator path based on latencies
  const generateSparklinePath = (history: number[]) => {
    if (!history || history.length === 0) return "";
    const width = 120;
    const height = 24;
    const padding = 2;
    const maxVal = Math.max(...history, 50);
    const minVal = Math.min(...history, 5);
    const range = maxVal - minVal || 1;

    const points = history.map((val, i) => {
      const x = (i / (history.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - minVal) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  // Aggregate stats
  const upCount = servers.filter((s) => s.status === "up").length;
  const avgUptime = servers.reduce((acc, s) => acc + s.uptime, 0) / servers.length;
  const activeLatencyAvg = servers.filter((s) => s.status === "up").reduce((acc, s) => acc + s.latency, 0) / (upCount || 1);

  return (
    <div className="space-y-4 pb-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Server Monitor</h1>
          <p className="text-xs text-slate-400">Giám sát uptime và mô phỏng phản hồi máy chủ</p>
        </div>
        <button
          onClick={triggerPingTest}
          disabled={isPinging}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.bgMuted} hover:bg-white/10 border ${theme.border} ${theme.text} text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50`}
          id="ping-all-btn"
        >
          <RefreshCw size={12} className={isPinging ? "animate-spin" : ""} />
          {isPinging ? "Đang ping..." : "Ping Check"}
        </button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-3 text-center space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Trực tuyến</p>
          <p className={`text-lg font-mono font-bold ${theme.text}`}>
            {upCount}<span className="text-xs text-slate-500">/{servers.length}</span>
          </p>
        </div>
        <div className="glass-card rounded-2xl p-3 text-center space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avg Uptime</p>
          <p className={`text-lg font-mono font-bold ${theme.text}`}>
            {avgUptime.toFixed(2)}<span className="text-xs text-slate-500">%</span>
          </p>
        </div>
        <div className="glass-card rounded-2xl p-3 text-center space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phản hồi</p>
          <p className={`text-lg font-mono font-bold ${theme.text}`}>
            {upCount > 0 ? activeLatencyAvg.toFixed(0) : "0"}<span className="text-xs text-slate-500">ms</span>
          </p>
        </div>
      </div>

      {/* Warning Alert if any server is down */}
      {servers.some((s) => s.status === "down") && (
        <div className={`glass-card rounded-2xl p-3 border-l-4 ${theme.border} ${theme.bgMuted} flex items-start gap-2.5`}>
          <AlertCircle className={`${theme.text} flex-shrink-0 mt-0.5`} size={16} />
          <div>
            <h4 className={`text-xs font-bold ${theme.textMuted} font-display`}>Cảnh báo: Có Server ngừng hoạt động!</h4>
            <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
              Phát hiện máy chủ gặp lỗi phản hồi. Hãy nhấn nút "Phục hồi" hoặc kích hoạt lại dịch vụ.
            </p>
          </div>
        </div>
      )}

      {/* Server List */}
      <div className="space-y-3">
        {servers.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-2">
            <Server className={`mx-auto ${theme.text} opacity-80`} size={32} />
            <p className="text-sm font-semibold text-slate-300">Chưa có máy chủ nào trong danh sách</p>
            <p className="text-xs text-slate-500">Hệ thống giám sát hiện đang trống dữ liệu mock. Bạn có thể thêm máy chủ mới bất kỳ lúc nào.</p>
          </div>
        ) : (
          servers.map((server) => {
          const isUp = server.status === "up";
          return (
            <div 
              key={server.id}
              className={`glass-card rounded-2xl p-4 transition border-l-4 ${theme.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Server Info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`w-2.5 h-2.5 rounded-full ${isUp ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"}`}></span>
                    <h3 className="text-sm font-bold text-white font-display truncate">
                      {server.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">{server.url}</p>
                </div>

                {/* Status Badge & Control */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${isUp ? `${theme.bgMuted} ${theme.text} border ${theme.borderMuted}` : "bg-white/5 text-slate-500 border border-white/5"}`}>
                    {isUp ? "ONLINE" : "OFFLINE"}
                  </span>
                  
                  {/* Simulations Action Button */}
                  <button
                    onClick={() => toggleServerStatus(server.id)}
                    className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${theme.bgMuted} ${theme.text} ${theme.border} hover:bg-white/10`}
                    id={`toggle-status-${server.id}`}
                  >
                    {isUp ? "Sập hệ thống (Crash)" : "Phục hồi (Recover)"}
                  </button>
                </div>
              </div>

              {/* Sub Technical Grid */}
              <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 mt-3 items-center">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Uptime</p>
                  <p className="text-xs font-mono font-bold text-slate-300">{server.uptime}%</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Latency</p>
                  <p className="text-xs font-mono font-bold text-slate-300">
                    {isUp ? `${server.latency} ms` : "∞"}
                  </p>
                </div>

                {/* SVG Sparkline */}
                <div className="flex flex-col items-end">
                  <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Đồ thị trễ</p>
                  {isUp ? (
                    <svg width="100" height="18" className={`${theme.text} overflow-visible`}>
                      <path
                        d={generateSparklinePath(server.history)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-mono">Đoạn mạch đứt</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-500 mt-2 font-mono">
                <span>Lần cuối Ping: {server.lastPing}</span>
                <span>An toàn</span>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Guide Card */}
      <div className={`glass-card rounded-2xl p-4 ${theme.bgMuted} border ${theme.borderMuted} flex gap-3`}>
        <div className={`p-2 ${theme.bgMuted} ${theme.text} border ${theme.borderMuted} rounded-full flex-shrink-0 self-start`}>
          <Activity size={16} />
        </div>
        <div className="space-y-1">
          <h4 className={`text-xs font-bold ${theme.text} uppercase tracking-wider font-display`}>Bộ mô phỏng thông minh</h4>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Nhấn <strong>"Sập hệ thống (Crash)"</strong> để kích hoạt sự cố giả lập. Trợ lý sẽ phát hiện lỗi tức thời, tạo thông báo hệ thống và đề xuất phương án tối ưu trong bản tin AI hoặc Chatbot!
          </p>
        </div>
      </div>
    </div>
  );
}
