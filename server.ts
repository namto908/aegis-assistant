import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. API: Chat with Virtual Assistant
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid 'messages' format." });
    }

    const ai = getGeminiClient();

    // Map message roles for Gemini ('user' and 'model' only)
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content || "" }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction || "Bạn là Aegis, trợ lý ảo đa năng quản lý hệ thống cá nhân của người dùng. Hãy trả lời thân thiện, hữu ích và ngắn gọn bằng Tiếng Việt.",
        temperature: 0.7,
      },
    });

    const text = response.text || "Xin lỗi, tôi không thể xử lý yêu cầu này.";
    res.json({ text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during communication with Gemini." });
  }
});

// 2. API: Generate Daily Briefing / Newsletter based on system state
app.post("/api/gemini/briefing", async (req, res) => {
  try {
    const { tasks, servers, notifications, assistantName, customPrompt } = req.body;

    const ai = getGeminiClient();

    const systemPrompt = customPrompt || "Bạn là Aegis, trợ lý ảo quản trị hệ thống cá nhân.";
    const userPrompt = `
Hãy viết một bản tin tổng hợp (Daily Briefing) ngắn gọn, hiện đại và tràn đầy động lực bằng Tiếng Việt dựa trên các thông tin hệ thống sau đây:

Tên Trợ lý ảo của bạn: ${assistantName || "Aegis"}

1. DANH SÁCH CÔNG VIỆC (TASKS):
${JSON.stringify(tasks, null, 2)}

2. TRẠNG THÁI SERVER UPTIME:
${JSON.stringify(servers, null, 2)}

3. TRUNG TÂM THÔNG BÁO GẦN ĐÂY:
${JSON.stringify(notifications, null, 2)}

YÊU CẦU ĐỊNH DẠNG BẢN TIN:
- Sử dụng giọng điệu tự nhiên, lịch sự, công nghệ nhưng thân thiện (ví dụ: chào chủ nhân, cập nhật nhanh buổi sáng/chiều).
- Tóm tắt ngắn gọn số lượng công việc đã hoàn thành vs chưa hoàn thành.
- Nhắc nhở về các server có vấn đề hoặc thông báo chưa đọc quan trọng.
- Cung cấp 1 lời khuyên thông minh để làm việc hiệu quả dựa trên danh sách này.
- Giữ bản tin cô đọng, chia thành các phần dễ đọc với emoji tương ứng, định dạng Markdown đẹp mắt.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt + " Bạn là một trợ lý ảo chuyên nghiệp, hành văn mượt mà và tập trung vào các điểm tin quan trọng.",
        temperature: 0.8,
      },
    });

    const text = response.text || "Không thể khởi tạo bản tin lúc này.";
    res.json({ text });
  } catch (error: any) {
    console.error("Gemini Briefing Error:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating briefing." });
  }
});

// 3. API: Generate Real-time Technical or AI News using Google Search Grounding
app.post("/api/gemini/news", async (req, res) => {
  try {
    const { topic, customTopic, tasks, servers } = req.body;
    const ai = getGeminiClient();

    const today = new Date();
    const currentDateStr = today.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let prompt = "";
    let useSearch = false;

    if (topic === "hacker-news") {
      useSearch = true;
      prompt = `Hãy tìm kiếm các tin tức công nghệ hot nhất, được thảo luận nhiều nhất trên Hacker News ngày hôm nay ${currentDateStr} (hoặc tuần này).
Chọn ra 3 bài viết nổi bật và hấp dẫn nhất, viết tóm tắt nội dung chính bằng Tiếng Việt.
Bản tin cần có cấu trúc rõ ràng với các đề mục, tóm lược ý chính, phân tích súc tích tầm ảnh hưởng công nghệ và các ý kiến bình luận giá trị nhất từ cộng đồng Hacker News.`;
    } else if (topic === "ai-news") {
      useSearch = true;
      prompt = `Hãy tìm kiếm những cập nhật đột phá, tin tức mới nhất về Trí tuệ Nhân tạo (AI), các mô hình ngôn ngữ lớn LLM, Generative AI ngày hôm nay ${currentDateStr} (từ các nguồn uy tín như OpenAI, Google, Anthropic, Meta hoặc cộng đồng open-source).
Chọn ra 3 tin tức chấn động hoặc thú vị nhất, viết một bản tin tổng hợp súc tích bằng Tiếng Việt.`;
    } else if (topic === "custom" && customTopic) {
      useSearch = true;
      prompt = `Hãy tìm kiếm thông tin mới nhất và nổi bật nhất ngày hôm nay về chủ đề: "${customTopic}".
Viết một bản tin tổng hợp, tóm tắt chi tiết, sắc bén bằng Tiếng Việt. Cung cấp các thông tin liên quan, các tiêu đề phụ rõ ràng và phân tích ngắn gọn.`;
    } else {
      // System update summary
      prompt = `Hãy viết một bản tin nội bộ tóm tắt tình trạng hệ thống ngày hôm nay ${currentDateStr}.
Dưới đây là dữ liệu trạng thái hiện tại:
- Danh sách công việc (Tasks): ${JSON.stringify(tasks || [])}
- Danh sách máy chủ (Servers): ${JSON.stringify(servers || [])}

Hãy viết một báo cáo nhanh, chỉ ra những chỉ số quan trọng, công việc cần ưu tiên xử lý ngày hôm nay, và lời khuyên tối ưu hạ tầng mạng.`;
    }

    const systemInstruction = `Bạn là một trợ lý ảo phân tích tin tức chuyên nghiệp tên là Aegis. Nhiệm vụ của bạn là cung cấp một bản tin tóm tắt chất lượng cao, súc tích và trình bày đẹp đẽ bằng Tiếng Việt. 
Hãy trả về một đối tượng JSON hợp lệ duy nhất tuân thủ đúng cấu trúc JSON Schema được yêu cầu. Không bọc JSON trong bất kỳ thẻ markdown nào khác ngoài đối tượng JSON được yêu cầu.`;

    const config: any = {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { 
            type: Type.STRING, 
            description: "Tiêu đề hấp dẫn của bản tin, ví dụ: 'Bản Tin Hacker News 7:00 AM' hoặc 'Điểm Tin AI Đột Phá'" 
          },
          description: { 
            type: Type.STRING, 
            description: "Mô tả ngắn gọn, súc tích dài khoảng 1-2 câu tóm tắt nội dung bản tin để hiển thị nhanh trên danh sách thông báo." 
          },
          contentDetail: { 
            type: Type.STRING, 
            description: "Nội dung chi tiết tóm tắt các bài viết định dạng Markdown (có tiêu đề ##, danh sách gạch đầu dòng, các từ in đậm, liên kết link bài viết gốc nếu có, phân tích bài học) để người dùng có thể đọc chi tiết." 
          },
          sourceUrl: { 
            type: Type.STRING, 
            description: "Liên kết nguồn chính (như https://news.ycombinator.com hoặc website tin tức uy tín liên quan)." 
          }
        },
        required: ["title", "description", "contentDetail"]
      }
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config,
    });

    const text = response.text;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ mô hình Gemini.");
    }

    const newsData = JSON.parse(text);
    res.json(newsData);
  } catch (error: any) {
    console.error("Gemini News Error:", error);
    res.status(500).json({ error: error.message || "Đã xảy ra lỗi trong quá trình tổng hợp bản tin." });
  }
});

// Setup Vite Dev server or production static serving
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

initializeServer();
