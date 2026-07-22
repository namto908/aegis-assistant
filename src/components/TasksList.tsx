import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Calendar, AlertCircle, Clock, Check, Trash2, Edit3, X, 
  Search, Filter, ChevronRight, ChevronLeft, Bookmark, ArrowUpCircle, AlertTriangle 
} from "lucide-react";
import { Task, ScreenType, ThemeColor } from "../types";
import { getThemeClasses } from "../lib/theme";

interface TasksListProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  addNotification: (title: string, description: string, category: "task" | "server" | "system") => void;
  themeColor?: ThemeColor;
}

export default function TasksList({ tasks, setTasks, addNotification, themeColor = "slate" }: TasksListProps) {
  const theme = getThemeClasses(themeColor);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // New task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [category, setCategory] = useState("Công việc");
  const [deadline, setDeadline] = useState("");

  // Custom Calendar Modal State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOffset = (year: number, month: number) => (new Date(year, month, 1).getDay() + 6) % 7;

  const currentYear = calendarViewDate.getFullYear();
  const currentMonth = calendarViewDate.getMonth();

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const selected = `${currentYear}-${monthStr}-${dayStr}`;
    setDeadline(selected);
    setIsCalendarOpen(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: "task_" + Date.now(),
      title,
      description,
      category,
      deadline: deadline || new Date().toISOString().split("T")[0],
      priority,
      completed: false,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setTasks([newTask, ...tasks]);
    addNotification(
      `Đã tạo Task: ${title}`,
      `Task thuộc danh mục "${category}" với độ ưu tiên ${priority} đã được thiết lập thành công.`,
      "task"
    );

    // Reset Form
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setCategory("Công việc");
    setDeadline("");
    setIsAdding(false);
  };

  const toggleTask = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTasks(
      tasks.map((t) => {
        if (t.id === id) {
          const updatedStatus = !t.completed;
          addNotification(
            updatedStatus ? `Hoàn thành Task: ${t.title}` : `Khôi phục Task: ${t.title}`,
            updatedStatus 
              ? `Chúc mừng! Bạn đã hoàn thành xuất sắc công việc này.`
              : `Công việc đã được chuyển lại về trạng thái chờ xử lý.`,
            "task"
          );
          return { ...t, completed: updatedStatus };
        }
        return t;
      })
    );
    // Sync with selectedTask details
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask({ ...selectedTask, completed: !selectedTask.completed });
    }
  };

  const deleteTask = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks(tasks.filter((t) => t.id !== id));
    if (taskToDelete) {
      addNotification(`Đã xóa Task`, `Công việc "${taskToDelete.title}" đã được xóa khỏi hệ thống.`, "task");
    }
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask(null);
    }
  };

  const getBorderColor = (color: ThemeColor) => {
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

  const getHoverBorderColor = (color: ThemeColor) => {
    switch (color) {
      case "rose": return "hover:border-rose-400";
      case "emerald": return "hover:border-emerald-400";
      case "amber": return "hover:border-amber-400";
      case "purple": return "hover:border-purple-400";
      case "blue": return "hover:border-blue-400";
      case "slate": return "hover:border-slate-400";
      default: return "hover:border-cyan-400";
    }
  };
  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = 
      filter === "all" ? true :
      filter === "active" ? !t.completed : t.completed;

    const matchesPriority = 
      priorityFilter === "all" ? true : t.priority === priorityFilter;

    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getPriorityColor = (p: "High" | "Medium" | "Low") => {
    switch (p) {
      case "High": return `${theme.text} ${theme.bgMuted} ${theme.border} font-bold`;
      case "Medium": return `${theme.textMuted} bg-white/5 ${theme.borderMuted}`;
      case "Low": return `text-slate-400 bg-white/5 border-transparent`;
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Danh sách Task</h1>
          <p className="text-xs text-slate-400">Tương tác hoàn chỉnh để quản lý công việc hàng ngày</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-1 px-3 py-1.5 ${theme.bg} text-slate-950 hover:opacity-90 text-xs font-semibold rounded-xl transition cursor-pointer shadow-lg`}
          id="toggle-add-task-btn"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
          {isAdding ? "Đóng lại" : "Thêm Task"}
        </button>
      </div>

      {/* Add Task Box with Expand transition */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddTask} className="glass-card rounded-2xl p-4 space-y-3 mb-4">
              <h3 className={`text-sm font-semibold ${theme.textMuted} font-display flex items-center gap-1.5`}>
                <Bookmark size={14} /> Điền thông tin Task mới
              </h3>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tiêu đề công việc..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm glass-input rounded-xl text-white"
                  required
                  id="new-task-title"
                />
                
                <textarea
                  placeholder="Mô tả chi tiết công việc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm glass-input rounded-xl text-white h-20 resize-none"
                  id="new-task-desc"
                />

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Mức ưu tiên (Priority)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPriority("High")}
                        className={`flex items-center justify-center py-2 px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          priority === "High"
                            ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold`
                            : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Cao
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority("Medium")}
                        className={`flex items-center justify-center py-2 px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          priority === "Medium"
                            ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold`
                            : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Vừa
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority("Low")}
                        className={`flex items-center justify-center py-2 px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          priority === "Low"
                            ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold`
                            : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Thấp
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Danh mục</label>
                      <input
                        type="text"
                        placeholder="e.g. Server, Dev..."
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs glass-input rounded-xl text-white font-medium"
                        id="new-task-category"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Hạn chót (Deadline)</label>
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(true)}
                        className={`w-full px-3 py-2 text-xs glass-input rounded-xl text-left flex items-center justify-between font-mono cursor-pointer ${deadline ? "text-white" : "text-slate-400"}`}
                        id="new-task-deadline-btn"
                      >
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className={theme.text} />
                          {deadline || "Chọn hạn chót..."}
                        </span>
                        <ChevronRight size={14} className="text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* Deadline Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-medium">Nhanh:</span>
                    <button
                      type="button"
                      onClick={() => setDeadline(new Date().toISOString().split("T")[0])}
                      className="px-2 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 rounded-lg transition cursor-pointer"
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tmr = new Date();
                        tmr.setDate(tmr.getDate() + 1);
                        setDeadline(tmr.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 rounded-lg transition cursor-pointer"
                    >
                      Ngày mai
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextWk = new Date();
                        nextWk.setDate(nextWk.getDate() + 7);
                        setDeadline(nextWk.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 rounded-lg transition cursor-pointer"
                    >
                      +7 Ngày
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2 ${theme.bgMuted} hover:bg-opacity-80 border ${theme.border} ${theme.text} text-xs font-bold rounded-xl transition cursor-pointer`}
                id="submit-task-btn"
              >
                Khởi tạo nhiệm vụ
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm công việc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs glass-input rounded-xl text-white"
            id="search-tasks-input"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs rounded-xl transition cursor-pointer border ${filter === "all" ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text}` : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"}`}
            id="filter-all"
          >
            Tất cả ({tasks.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1 text-xs rounded-xl transition cursor-pointer border ${filter === "active" ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text}` : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"}`}
            id="filter-active"
          >
            Chờ xử lý ({tasks.filter(t => !t.completed).length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1 text-xs rounded-xl transition cursor-pointer border ${filter === "completed" ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text}` : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"}`}
            id="filter-completed"
          >
            Đã xong ({tasks.filter(t => t.completed).length})
          </button>

          {/* Priority filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 w-full">
            <button
              onClick={() => setPriorityFilter("all")}
              className={`px-2.5 py-1 text-[11px] rounded-xl transition border cursor-pointer ${
                priorityFilter === "all"
                  ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold`
                  : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Ưu tiên: Tất cả
            </button>
            <button
              onClick={() => setPriorityFilter("High")}
              className={`px-2.5 py-1 text-[11px] rounded-xl transition border cursor-pointer ${
                priorityFilter === "High"
                  ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold`
                  : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Cao
            </button>
            <button
              onClick={() => setPriorityFilter("Medium")}
              className={`px-2.5 py-1 text-[11px] rounded-xl transition border cursor-pointer ${
                priorityFilter === "Medium"
                  ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold`
                  : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Vừa
            </button>
            <button
              onClick={() => setPriorityFilter("Low")}
              className={`px-2.5 py-1 text-[11px] rounded-xl transition border cursor-pointer ${
                priorityFilter === "Low"
                  ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold`
                  : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Thấp
            </button>
          </div>
        </div>
      </div>

      {/* Task List Render */}
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
        {filteredTasks.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm text-slate-400">Không tìm thấy công việc nào phù hợp.</p>
            <p className="text-xs text-slate-500">Hãy nhấn "Thêm Task" để thiết lập mục tiêu mới!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              layoutId={task.id}
              onClick={() => setSelectedTask(task)}
              className={`glass-card rounded-xl p-3 flex items-center justify-between cursor-pointer border-l-4 transition hover:bg-white/10 ${task.completed ? "border-l-slate-600 bg-white/2" : getBorderColor(themeColor)} ${task.completed ? "opacity-60" : "opacity-100"}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Custom Styled Checkbox */}
                <button
                  onClick={(e) => toggleTask(task.id, e)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${task.completed ? "bg-slate-700 border-slate-600 text-slate-300" : `border-white/20 text-transparent ${getHoverBorderColor(themeColor)}`}`}
                  id={`checkbox-${task.id}`}
                >
                  <Check size={12} className={task.completed ? "opacity-100" : "opacity-0"} />
                </button>

                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-semibold truncate ${task.completed ? "line-through text-slate-400" : "text-white"}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md">
                      {task.category}
                    </span>
                    <span className={`text-[10px] border px-1.5 py-0.5 rounded-md font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-mono">
                      <Clock size={10} /> {task.deadline}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-2">
                <button
                  onClick={(e) => deleteTask(task.id, e)}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition"
                  id={`delete-btn-${task.id}`}
                  title="Xóa công việc"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="text-slate-500" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Task Details Interactive Drawer / Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-slate-950 border border-white/10 rounded-t-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden"
              id="task-detail-modal"
            >
              {/* Decorative top drag bar */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2"></div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedTask(null)}
                className="absolute top-4 right-4 p-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 hover:text-white transition"
                id="close-task-detail-btn"
              >
                <X size={16} />
              </button>

              <div className="space-y-2">
                <span className={`inline-block text-xs border px-2 py-0.5 rounded-full font-semibold ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority} Priority
                </span>
                <h2 className={`text-xl font-bold font-display ${selectedTask.completed ? "line-through text-slate-400" : "text-white"}`}>
                  {selectedTask.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 border-y border-white/5 py-2">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar size={12} /> Hạn chót: {selectedTask.deadline}
                  </span>
                  <span>Danh mục: <strong className="text-slate-300 font-medium">{selectedTask.category}</strong></span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả công việc</h4>
                <p className="text-sm text-slate-300 leading-relaxed bg-white/5 border border-white/5 p-3 rounded-xl max-h-24 overflow-y-auto no-scrollbar">
                  {selectedTask.description || "Không có mô tả chi tiết cho công việc này."}
                </p>
              </div>

              {/* Action buttons inside drawer */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => toggleTask(selectedTask.id)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${selectedTask.completed ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} hover:bg-white/10` : `${theme.bg} text-slate-950 hover:opacity-90 border-transparent`}`}
                  id="modal-toggle-status-btn"
                >
                  <Check size={14} />
                  {selectedTask.completed ? "Khôi phục trạng thái" : "Hoàn thành Task"}
                </button>

                <button
                  onClick={() => deleteTask(selectedTask.id)}
                  className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  id="modal-delete-task-btn"
                >
                  <Trash2 size={14} />
                  Xóa công việc
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Aegis OS Calendar Modal */}
      <AnimatePresence>
        {isCalendarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xs bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-3 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 className={`text-xs font-bold ${theme.text} font-display uppercase tracking-wider`}>
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((dayName, idx) => (
                  <span key={idx} className="text-[10px] font-bold text-slate-500">
                    {dayName}
                  </span>
                ))}
              </div>

              {/* Grid of days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty slots for offset */}
                {Array.from({ length: getFirstDayOffset(currentYear, currentMonth) }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-8" />
                ))}

                {/* Days */}
                {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const monthStr = String(currentMonth + 1).padStart(2, "0");
                  const dayStr = String(dayNum).padStart(2, "0");
                  const dateString = `${currentYear}-${monthStr}-${dayStr}`;
                  const isSelected = deadline === dateString;
                  const isToday = new Date().toISOString().split("T")[0] === dateString;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`h-8 w-8 mx-auto rounded-xl text-xs font-mono flex items-center justify-center transition cursor-pointer ${
                        isSelected
                          ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text} font-bold border`
                          : isToday
                          ? "border border-white/20 text-white font-bold"
                          : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setDeadline(new Date().toISOString().split("T")[0]);
                    setIsCalendarOpen(false);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white font-medium transition cursor-pointer"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
