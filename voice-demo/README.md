# 实时语音问答 Demo

一个零依赖的实时语音问答体验页。默认使用本机 Ollama + 浏览器语音能力，不需要 API Key；也保留了 OpenAI Realtime WebRTC 连接方式。

## 启动

```bash
cd /Users/callum/Desktop/ship/loci-release/voice-demo
node server.js
```

浏览器打开：<http://127.0.0.1:4173>

默认读取本机的 `qwen3.5:4b`。如果要换一个已安装的 Ollama 模型：

```bash
OLLAMA_MODEL="qwen2.5:7b" node server.js
```

如果以后配置了 OpenAI API Key，也可以使用 Realtime 模型：

```bash
OPENAI_API_KEY="你的 API Key" OPENAI_REALTIME_MODEL="gpt-realtime" node server.js
```

## 当前能力

- 连续语音提问、流式生成和系统语音朗读
- 无 Key 时：浏览器语音识别 + 本机 Ollama + 系统语音朗读
- 有 Key 时：OpenAI Realtime WebRTC 双向语音
- 自动判断说完并回答
- 支持说话打断
- 输入、输出实时字幕
- 麦克风静音和文字提问
- 移动端布局

## 注意

- 麦克风要求安全上下文，本地 `localhost` / `127.0.0.1` 可以直接使用。
- 本地模式需要先启动 Ollama，并安装对应模型：`ollama pull qwen3.5:4b`。
- 连续语音识别请优先使用最新版 Chrome 或 Safari。
- 如果使用 OpenAI，请勿把 API Key 写进 `index.html` 或提交到 Git。
- 这是体验版，没有登录、限流、知识库和用量控制，不要直接公开部署。
