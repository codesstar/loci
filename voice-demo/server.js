#!/usr/bin/env node

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);
const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.5:4b";
const INDEX_PATH = path.join(__dirname, "index.html");

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function createRealtimeCall(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, {
      error: "服务端还没有设置 OPENAI_API_KEY。请按 README 的启动命令重新运行。",
    });
    return;
  }

  try {
    const offer = await readBody(request);
    if (!offer.length) {
      sendJson(response, 400, { error: "缺少 WebRTC SDP offer。" });
      return;
    }

    const upstream = await fetch(
      `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(MODEL)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer,
      },
    );

    const payload = await upstream.text();
    if (!upstream.ok) {
      let message = payload;
      try {
        const parsed = JSON.parse(payload);
        message = parsed.error?.message || parsed.error || payload;
      } catch {
        // Keep the upstream response as the error message.
      }
      sendJson(response, upstream.status, { error: message || "OpenAI Realtime 连接失败。" });
      return;
    }

    response.writeHead(200, {
      "Content-Type": "application/sdp",
      "Cache-Control": "no-store",
    });
    response.end(payload);
  } catch (error) {
    sendJson(response, 502, { error: error.message || "Realtime 连接失败。" });
  }
}

async function getLocalModelStatus() {
  try {
    const request = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!request.ok) return { available: false, model: OLLAMA_MODEL };
    const payload = await request.json();
    const models = Array.isArray(payload.models) ? payload.models : [];
    const available = models.some((item) => item.name === OLLAMA_MODEL || item.model === OLLAMA_MODEL);
    return { available, model: OLLAMA_MODEL };
  } catch {
    return { available: false, model: OLLAMA_MODEL };
  }
}

async function createLocalChat(request, response) {
  try {
    const rawBody = await readBody(request);
    const payload = JSON.parse(rawBody.toString("utf8") || "{}");
    const incomingMessages = Array.isArray(payload.messages) ? payload.messages : [];
    const messages = incomingMessages
      .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .slice(-12)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 12000) }));

    if (!messages.length || messages.at(-1).role !== "user") {
      sendJson(response, 400, { error: "缺少用户问题。" });
      return;
    }

    const upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        think: false,
        messages: [
          {
            role: "system",
            content: [
              "你是一个实时中文语音问答助手。",
              "回答要适合直接朗读：先给结论，使用简洁自然的短句，不要使用 Markdown、表格或网址。",
              "通常控制在 120 字以内；只有用户明确要求详细解释时才展开。",
              "不确定时坦诚说明，不要编造信息。",
            ].join("\n"),
          },
          ...messages,
        ],
        options: {
          temperature: 0.55,
          num_ctx: 8192,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!upstream.ok || !upstream.body) {
      const message = await upstream.text();
      sendJson(response, upstream.status || 502, { error: message || "本地模型调用失败。" });
      return;
    }

    response.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    if (error.name === "SyntaxError") {
      sendJson(response, 400, { error: "请求格式不正确。" });
      return;
    }
    sendJson(response, 502, { error: error.message || "无法连接本地 Ollama。" });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || HOST}`);

  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(INDEX_PATH).pipe(response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    const localModel = await getLocalModelStatus();
    sendJson(response, 200, {
      ok: true,
      model: MODEL,
      apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
      localModelAvailable: localModel.available,
      localModel: localModel.model,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/session") {
    await createRealtimeCall(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/local-chat") {
    await createLocalChat(request, response);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Voice demo: http://${HOST}:${PORT}`);
  console.log(`Realtime model: ${MODEL}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log(`OPENAI_API_KEY is not set; local fallback will use Ollama model ${OLLAMA_MODEL}.`);
  }
});
