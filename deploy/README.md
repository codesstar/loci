# deploy/ — 让 Loci dashboard 常驻

## launchd 开机自启（macOS）

```bash
BRAIN="$(loci path)"
sed -e "s|__BRAIN__|$BRAIN|g" -e "s|__HOME__|$HOME|g" \
  deploy/com.loci.dashboard.plist > ~/Library/LaunchAgents/com.loci.dashboard.plist
launchctl load ~/Library/LaunchAgents/com.loci.dashboard.plist
```

卸载：`launchctl unload ~/Library/LaunchAgents/com.loci.dashboard.plist`

日志在 `<brain>/.loci/dashboard.log`。模板里显式写了 PATH 和 HOME——launchd
不加载你的 shell 配置，内嵌 AI 聊天要靠它找到 `claude` 命令。

手机接入（Tailscale + PWA + 推送）见 `docs/mobile-setup.md`。
