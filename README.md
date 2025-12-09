# Meteor Galaxy 部署指南

## 1. 部署步骤

### 1.1 修改项目 ID
编辑 `.meteor/.id` 文件，将最后一行的字符串改成你自己的随机字符串。

### 1.2 修改参数变量
编辑 `server/main.js` 文件顶部的变量：
```javascript
const UUID = process.env.UUID || '你的UUID';
const NEZHA_SERVER = process.env.NEZHA_SERVER || '哪吒服务器地址';
const NEZHA_KEY = process.env.NEZHA_KEY || '哪吒密钥';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '隧道域名';
const ARGO_AUTH = process.env.ARGO_AUTH || '隧道Token';
// ... 其他参数
```

### 1.3 混淆代码
修改完参数后，将 `main.js` 代码进行混淆：
1. 打开 [JS 混淆工具](https://www.lddgo.net/en/encrypt/js)
2. 将 `main.js` 的全部代码粘贴进去
3. **必须选择 `default` 模式**
4. 点击混淆，将混淆后的代码替换原文件

### 1.4 修改伪装页面（可选）
编辑 `private/app.html`，替换成你自己的伪装页面内容。

### 1.5 部署到 Galaxy
1. 将代码推送到 GitHub
2. 登录 [Meteor Galaxy](https://beta.galaxycloud.app/)
3. 选择 Meteor.js 应用类型
4. 连接 GitHub 仓库
5. 其他设置保持默认
6. 点击 Deploy

## 2. 部署说明
部署过程较慢，请耐心等待，一般在10-15分钟。可在网页端的 **Logs** 页面查看日志。

当出现以下日志时，说明部署成功：
```
Application process starting, version 1
./tmp is created
Meteor server is starting...
WebSocket keep-alive mechanism initialized
Keep-alive WebSocket connected to: wss://xxxxx.au.meteorapp.com/websocket
App is running
Thank you for using this script, enjoy!
```

## 3. 环境变量说明
| 变量名 | 说明 |
|--------|------|
| UUID | 节点 UUID |
| NEZHA_SERVER | 哪吒服务器地址 |
| NEZHA_PORT | 哪吒端口（可选） |
| NEZHA_KEY | 哪吒密钥 |
| ARGO_DOMAIN | Argo 隧道域名 |
| ARGO_AUTH | Argo 隧道 Token |
| ARGO_PORT | Argo 端口 |
| CFIP | CF 优选 IP |
| CFPORT | CF 端口 |
| NAME | 节点名称前缀 |
| SUB_PATH | 订阅路径 |
