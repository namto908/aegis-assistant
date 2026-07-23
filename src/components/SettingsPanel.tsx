import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  User, Settings, Sparkles, Image, RefreshCw, Shield, 
  Mail, Key, Terminal, Code, Heart, Trash2, Palette, Upload 
} from "lucide-react";
import { AssistantConfig, ThemeColor, GoogleUser } from "../types";
import { getThemeClasses } from "../lib/theme";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { LogOut } from "lucide-react"; // Import LogOut icon

interface SettingsPanelProps {
  assistantConfig: AssistantConfig;
  setAssistantConfig: React.Dispatch<React.SetStateAction<AssistantConfig>>;
  resetMockData: () => void;
  userEmail?: string;
  addNotification: (title: string, description: string, category: "task" | "server" | "system") => void;
  user: GoogleUser | null;
  onLogout?: () => void;
}

const THEME_COLORS: { id: ThemeColor; name: string; bgClass: string }[] = [
  { id: "cyan", name: "Cyan", bgClass: "bg-cyan-400" },
  { id: "blue", name: "Blue", bgClass: "bg-blue-400" },
  { id: "emerald", name: "Emerald", bgClass: "bg-emerald-400" },
  { id: "purple", name: "Purple", bgClass: "bg-purple-400" },
  { id: "rose", name: "Rose", bgClass: "bg-rose-400" },
  { id: "amber", name: "Amber", bgClass: "bg-amber-400" },
  { id: "slate", name: "Slate", bgClass: "bg-slate-400" },
];

export default function SettingsPanel({ 
  assistantConfig, 
  setAssistantConfig, 
  resetMockData, 
  addNotification,
  user,
  onLogout
}: SettingsPanelProps) {
  const [name, setName] = useState(assistantConfig.name);
  const [prompt, setPrompt] = useState(assistantConfig.prompt);
  const [avatarUrl, setAvatarUrl] = useState(assistantConfig.avatarUrl);
  const [selectedColor, setSelectedColor] = useState<ThemeColor>(assistantConfig.themeColor || "slate");
  const [apiBaseUrl, setApiBaseUrl] = useState(assistantConfig.apiBaseUrl || "");
  const [isSaved, setIsSaved] = useState(false);

  const theme = getThemeClasses(selectedColor);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === "string") {
        setAvatarUrl(dataUrl);
        setAssistantConfig((prev) => ({
          ...prev,
          avatarUrl: dataUrl,
        }));
        addNotification(
          "Cập nhật ảnh đại diện",
          `Đã lưu ảnh đại diện mới cho trợ lý ${name}.`,
          "system"
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePickPhoto = () => {
    const fileInput = document.getElementById("local-avatar-file-input");
    if (fileInput) fileInput.click();
  };

  const handleSelectColor = (color: ThemeColor) => {
    setSelectedColor(color);
    // Apply theme color change instantly to make UI interactive
    setAssistantConfig(prev => ({
      ...prev,
      themeColor: color
    }));
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setAssistantConfig({
      name,
      prompt,
      avatarUrl,
      themeColor: selectedColor,
      apiBaseUrl,
    });
    setIsSaved(true);
    addNotification(
      "Thay đổi cấu hình AI",
      `Đã cập nhật trợ lý ảo "${name}". Đổi màu chủ đạo sang tông ${selectedColor.toUpperCase()}.`,
      "system"
    );
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTriggerReset = () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu mẫu (Tasks, Servers, Notifications)?")) {
      resetMockData();
      setSelectedColor("slate");
      addNotification("Đặt lại hệ thống", "Hệ thống đã khôi phục toàn bộ trạng thái dữ liệu mẫu ban đầu.", "system");
      alert("Đặt lại dữ liệu mẫu thành công!");
    }
  };

  return (
    <div className="space-y-4 pb-4 font-sans text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Cài đặt & Hồ sơ</h1>
          <p className="text-xs text-slate-400">Cá nhân hóa trợ lý AI và điều chỉnh giao diện</p>
        </div>
      </div>

      {/* User Info card */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
        {/* Subtle decorative glow of chosen theme color */}
        <div className={`absolute top-0 right-0 w-20 h-20 ${theme.glow} rounded-full blur-xl pointer-events-none`}></div>

        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full overflow-hidden border ${theme.borderMuted} flex items-center justify-center bg-white/5`}>
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User size={24} className={theme.text} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display">{user?.name || "Chủ nhân"}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
              <Mail size={12} className="text-slate-500" /> {user?.email || "unknown@aegis.com"}
            </p>
            <span className={`inline-block mt-1 text-[8px] tracking-widest font-mono uppercase bg-white/5 ${theme.text} border ${theme.borderMuted} px-1.5 py-0.5 rounded`}>
              {user?.idToken.startsWith("mock_") ? "Developer Mode" : "Google Account"}
            </span>
          </div>
        </div>

        {onLogout && (
          <button 
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/25 text-slate-400 hover:text-red-400 active:scale-95 transition cursor-pointer z-10 flex items-center justify-center"
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Primary Color Selector Section */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h2 className={`text-xs font-bold ${theme.text} uppercase tracking-wider font-display flex items-center gap-1.5`}>
          <Palette size={14} /> Màu sắc chủ đạo (Primary Theme)
        </h2>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {THEME_COLORS.map((color) => {
            const isSelected = selectedColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => handleSelectColor(color.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                  isSelected 
                    ? `bg-white/10 text-white ${theme.border}` 
                    : "bg-white/5 hover:bg-white/8 border-white/5 text-slate-400"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${color.bgClass}`}></span>
                {color.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assistant configuration form */}
      <form onSubmit={handleSaveConfig} className="glass-card rounded-2xl p-4 space-y-3">
        <h2 className={`text-xs font-bold ${theme.text} uppercase tracking-wider font-display flex items-center gap-1.5`}>
          <Sparkles size={14} /> Cấu hình Trợ Lý Ảo (AI Agent)
        </h2>

        <div className="space-y-3">
          {/* Avatar Url Preview & Input */}
          <div className="flex items-start gap-4 py-1">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 bg-slate-900 flex-shrink-0 relative group">
                <img 
                  src={avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <button 
                type="button"
                onClick={handlePickPhoto}
                className={`flex items-center gap-1 px-2.5 py-1 ${theme.bgMuted} hover:bg-white/10 border ${theme.borderMuted} ${theme.text} text-[9px] font-bold rounded-lg cursor-pointer transition`}
                id="upload-local-avatar-label"
              >
                <Upload size={10} />
                Chọn ảnh local
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="local-avatar-file-input"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Image size={10} /> Link ảnh đại diện (Avatar URL)
              </label>
              <input
                type="url"
                placeholder="https://... hoặc mã hóa base64"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] glass-input rounded-xl text-white font-mono"
                id="setting-avatar-url"
              />
            </div>
          </div>

          {/* Name input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Tên Trợ lý ảo
            </label>
            <input
              type="text"
              placeholder="e.g. Aegis, Jarvis, Cortana..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs glass-input rounded-xl text-white font-medium"
              required
              id="setting-assistant-name"
            />
          </div>

          {/* API Base URL input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Terminal size={10} /> Địa chỉ API Server (API Base URL)
            </label>
            <input
              type="url"
              placeholder="e.g. http://192.168.1.100:3000 hoặc bỏ trống"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs glass-input rounded-xl text-white font-mono"
              id="setting-api-base-url"
            />
          </div>

          {/* Prompt/Instruction Area */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              System Instructions (Prompt gốc định hướng AI)
            </label>
            <textarea
              placeholder="Nhập prompt định hình tính cách, vai trò và lối trả lời của AI..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 text-xs glass-input rounded-xl text-white h-24 resize-none leading-relaxed font-sans"
              required
              id="setting-assistant-prompt"
            />
          </div>
        </div>

        <button
          type="submit"
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${isSaved ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" : `${theme.bg} hover:opacity-95 text-slate-950 shadow-lg ${theme.shadow} border-transparent`}`}
          id="setting-save-btn"
        >
          {isSaved ? "Đã lưu cấu hình!" : "Lưu Thay Đổi"}
        </button>
      </form>

      {/* Utilities / Management list */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Tính năng giả lập & Gỡ lỗi</h2>
        
        <div className="space-y-2">
          {/* Reset Mock Data */}
          <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                <RefreshCw size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Reset Dữ Liệu</h4>
                <p className="text-[10px] text-slate-500">Khôi phục mặc định Tasks & Servers</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTriggerReset}
              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold rounded-lg transition cursor-pointer"
              id="reset-mock-btn"
            >
              Reset mẫu
            </button>
          </div>

          {/* Code specs */}
          <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${theme.bgMuted} border ${theme.borderMuted} ${theme.text} rounded-lg`}>
                <Code size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Kiến trúc UI</h4>
                <p className="text-[10px] text-slate-500">Bản thiết kế Glassmorphic hoàn thiện</p>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">React 19 + Tailwind v4</span>
          </div>

          {/* Secure key info */}
          <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                <Shield size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Bảo mật API Key</h4>
                <p className="text-[10px] text-slate-500">Toàn bộ yêu cầu qua proxy backend</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">An toàn</span>
          </div>
        </div>
      </div>

      {/* Handcrafted Footer details */}
      <p className="text-[10px] text-slate-600 text-center flex items-center justify-center gap-1 pt-2 font-display">
        Thiết kế bằng phong cách Glassmorphism tối giản <Heart size={10} className="text-rose-500 fill-rose-500" /> 2026
      </p>
    </div>
  );
}
