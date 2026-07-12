# 手机接入 Loci（iPhone）

让 iPhone 随时打开你的大脑、并在锁屏收到日程/任务提醒。整个方案数据不出你的电脑：手机通过 Tailscale 私有网络直连 Mac，云端没有任何一份拷贝。

## 原理一图流

```
iPhone（PWA + 锁屏推送）
   │  Tailscale 私有网络（WireGuard 加密）
   ▼
你的 Mac（tailscale serve 反代 HTTPS → localhost:8765）
   └─ Loci dashboard server（含服务端提醒调度器）
```

## 一次性设置（约 15 分钟）

### 1. Mac 端：Tailscale

1. 安装：`brew install --cask tailscale`（或从 App Store / tailscale.com 下载）
2. 打开 Tailscale 并登录（Google/GitHub/Apple 账号皆可，免费）
3. 在 Tailscale 设置里确认 **MagicDNS** 已开启（默认开启）
4. 把 dashboard 反代成 HTTPS（Service Worker 和推送的硬性前提）：

```bash
tailscale serve --bg https / http://127.0.0.1:8765
```

5. 查看你的专属地址：`tailscale status` 里的机器名，形如
   `https://<你的Mac名>.<尾网名>.ts.net`

### 2. Mac 端：启用手机推送（一次性）

```bash
cd "$(loci path)/.loci/dashboard" && npm install web-push
loci stop && loci     # 重启 dashboard
```

> 这是 Loci 唯一的可选 npm 依赖，只有手机推送需要它。不装它，其余功能完全不受影响。

### 3. iPhone 端

1. App Store 安装 **Tailscale**，用同一账号登录，打开 VPN 开关
2. Safari 打开 `https://<你的Mac名>.<尾网名>.ts.net`
3. 首次会要求输入访问令牌——在 Mac 上运行 `loci token` 获取，输入一次即记住
4. 点分享按钮 → **添加到主屏幕**（这一步必须做，iOS 只允许主屏 PWA 收推送）
5. 从主屏幕图标打开 Loci → 右上角铃铛 → **手机推送 → 开启/关闭** → 允许通知
6. 点 **测试**，10 秒内锁屏应该出现「Loci 测试推送」

## 日常使用

- 提醒规则和电脑上完全一致：日程（calendar）+ 带时间的任务（任务池），按铃铛里设置的提前量推送
- 静音时段跟随 wellbeing 设置（默认 22:30–07:00 不推）
- Mac 重启后：Tailscale 和 `tailscale serve` 会自动恢复；dashboard 用下面的自启方案

## 让 Mac 一直在线（三选一）

| 方案 | 命令 | 适合 |
|---|---|---|
| 插电永不睡（推荐） | `sudo pmset -c sleep 0` | Mac 常年插电 |
| 前台防睡模式 | `loci serve` | 不想动系统设置，跑在一个终端里 |
| 开机自启 | 见 `deploy/README.md` 的 launchd 模板 | 想彻底忘掉这件事 |

> 合盖注意：MacBook 合盖默认会睡眠。插电 + `pmset -c sleep 0` 后合盖仍可能睡（取决于机型），最稳的是不合盖或外接显示器；`loci serve`（caffeinate）能在开盖插电时保证不睡。

## 常见问题

- **收不到推送？** 依次检查：① iPhone 的 Tailscale VPN 开着吗；② 是从主屏幕图标打开的吗（Safari 里打开收不到）；③ 铃铛菜单里点「测试」有反应吗；④ iOS 设置 → 通知 → Loci，允许「锁定屏幕」和「横幅」；⑤ Mac 睡着了吗
- **订阅会悄悄失效**（iOS 特性）：每次打开 PWA 会自动重新上报订阅，一般无感；长期收不到就重新开关一次「手机推送」
- **删除了主屏图标** = 推送断链，重新添加并再开一次推送
- **换了 Mac 名字 / 尾网名**：地址会变，重新在手机上打开新地址即可，令牌不变
