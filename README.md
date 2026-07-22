# 🛡️ Aegis Assistant OS — AI Trợ Lý & Quản Trị Hệ Thống Mobile

<div align="center">

**Giao diện Glassmorphism tối tân • Android Native Edge-to-Edge • Động cơ AI Gemini-3.5-Flash • Tối ưu hóa màn hình LTPO 120Hz**

[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue.svg)](https://github.com/namto908/aegis-assistant)
[![Framework](https://img.shields.io/badge/Framework-React%2018%20%7C%20Capacitor%206-emerald.svg)](https://react.dev/)
[![Styling](https://img.shields.io/badge/Styling-TailwindCSS%20%7C%20Framer%20Motion-purple.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-slate.svg)](LICENSE)

</div>

---

## 🌟 Giới Thiệu (Overview)

**Aegis Assistant** là hệ điều hành di động trợ lý cá nhân và trung tâm quản trị máy chủ từ xa thông minh. Ứng dụng kết hợp giữa thiết kế **Glassmorphism hiện đại**, trải nghiệm **Android Native Edge-to-Edge tràn viền 100%**, và **Trí tuệ nhân tạo Google Gemini**.

Ứng dụng được tối ưu hóa đặc biệt cho các thiết bị cao cấp (như Xiaomi 15 với công nghệ màn hình LTPO 1Hz - 120Hz), giúp thao tác chuyển trang siêu mượt mà, chống nóng máy và tiết kiệm pin tối đa.

---

## ✨ Tính Năng Nổi Bật (Key Features)

### 📱 1. Trải Nghiệm Native Android Edge-to-Edge
* **Tràn viền 100% Phía Trên & Phía Dưới**: Thanh trạng thái (Status Bar) và Thanh cử chỉ Android (Gesture Navigation Bar) hoàn toàn trong suốt.
* **Xử lý Nút Back & Cử chỉ vuốt**:
  - Hỗ trợ Stack lịch sử duyệt trang (`screenHistory`).
  - Xác nhận 2 lần vuốt để thoát ứng dụng ở màn hình chính (Double-swipe exit toast).
* **Không làm vồng Taskbar khi gõ bàn phím**: Tích hợp `windowSoftInputMode="adjustPan"` ngăn bàn phím ảo đẩy nảy thanh Taskbar bên dưới.

### 🤖 2. Trợ Lý Trí Tuệ Nhân Tạo (Gemini AI Engine)
* **AI Daily Briefing**: Sinh báo cáo tổng quan công việc & máy chủ mỗi ngày theo ngữ cảnh cá nhân.
* **Multi-turn AI Chatbot**: Trò chuyện thông minh, hiểu được danh sách Tasks và trạng thái Server thời gian thực.
* **Search Grounding News**: Điểm tin công nghệ & tóm tắt trạng thái hệ thống tự động.

### 📝 3. Quản Lý Nhiệm Vụ (Tasks OS)
* **Custom Priority Selector**: Thiết kế nút chọn mức ưu tiên (**Cao**, **Vừa**, **Thấp**) chuẩn tông màu Theme tối giản.
* **Custom Aegis Calendar Modal**: Trình chọn lịch & ngày hạn chót (Deadline) thiết kế riêng phong cách kính tối xám, thay thế hoàn toàn trình chọn ngày mặc định cũ.

### 🖥️ 4. Giám Sát Máy Chủ (Server Uptime Monitoring)
* Theo dõi các chỉ số thời gian thực: Uptime %, Latency (ms), CPU %, RAM %, và Disk %.
* Kiểm tra phản hồi (Ping) và thông báo khẩn cấp khi máy chủ sự cố.

### 🎨 5. Cá Nhân Hóa & Đổi IP Backend Linh Động
* Bộ chọn chủ đề 7 màu accent: **Slate (Mặc định)**, Cyan, Blue, Emerald, Purple, Rose, Amber.
* **Chọn ảnh đại diện Local**: Cập nhật ảnh tức thì và lưu trữ vĩnh viễn trong `localStorage`.
* **Cấu hình IP Server**: Dễ dàng nhập IP/Domain Backend qua trang Cài đặt để chạy độc lập hoặc kết nối Server riêng.

### ⚡ 6. Tối Ưu Hóa Hiệu Năng LTPO 120Hz
* **Tăng tốc phần cứng GPU (`transform-gpu`)**: Loại bỏ các hiệu ứng GPU blur nặng, cho phép màn hình LTPO tự động hạ tần số quét xuống 1Hz khi đứng yên và tăng lên 120Hz khi vuốt.
* **Dọn dẹp tài nguyên (`AbortController`)**: Tự động ngắt request dở dang khi chuyển trang, chống tràn RAM và nóng máy.
* **Throttling 120ms**: Ngăn chặn tình trạng xếp chồng animation khi bấm chuyển tab liên tục.

---

## 🛠️ Cấu Trúc Dự Án (Project Structure)

```text
aegis-assistant/
├── android/                    # Mã nguồn Native Android (Capacitor wrapper, Manifest, Styles)
├── src/
│   ├── components/             # Danh sách Components chính của hệ thống
│   │   ├── AssistantChat.tsx   # Trò chuyện AI Chatbot
│   │   ├── Dashboard.tsx       # Màn hình chính (Bento Grid / Compact view)
│   │   ├── NotificationsCenter.tsx # Trung tâm thông báo & Tin tức
│   │   ├── ServerMonitoring.tsx # Màn hình giám sát Uptime & Server
│   │   ├── SettingsPanel.tsx   # Cấu hình Trợ lý & IP Backend
│   │   └── TasksList.tsx       # Quản lý Task & Aegis Calendar Picker
│   ├── lib/
│   │   └── theme.ts            # Động cơ quản lý Palette & Theme Classes
│   ├── App.tsx                 # Root Component & Điều hướng cử chỉ Android
│   ├── main.tsx                # Entry point React
│   └── types.ts                # TypeScript Interfaces & Schemas
├── BACKEND_SPECIFICATION.md    # Tài liệu đặc tả API & CSDL chi tiết cho Backend
├── capacitor.config.ts         # Cấu hình Capacitor Mobile
├── package.json
└── README.md
```

---

## 📐 Đặc Tả Backend (Backend Specification)

Tài liệu chi tiết các API RESTful endpoints, dữ liệu JSON request/response và cấu hình CORS để viết Backend nằm tại:
👉 **[BACKEND_SPECIFICATION.md](./BACKEND_SPECIFICATION.md)**

---

## 🚀 Hướng Dẫn Chạy & Biên Dịch (Run & Build Instructions)

### Yêu Cầu Tối Thiểu
* **Node.js**: `v18.0.0` trở lên
* **Android Studio**: (Dành cho biên dịch APK Native)

### 1. Khởi Chạy Local Web
```bash
# Cài đặt thư viện
npm install

# Khởi chạy máy chủ phát triển
npm run dev
```

### 2. Biên Dịch Android APK (Tùy Chọn)
```bash
# 1. Khởi tạo platform Android local (nếu chưa có thư mục android)
npx cap add android

# 2. Build bản bundle web và sync với Capacitor
npm run build && npx cap sync

# 3. Biên dịch APK Debug bằng Gradle
cd android
./gradlew assembleDebug
```

---

## 📜 Giấy Phép (License)

Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
