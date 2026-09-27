'use strict';


const CONFIG_DIR = '/data/misc/keystore/omk';
const STATE_DIR = '/data/adb/omk';
const KEYSTORE_UID = 1017;
const FIX_PROPS_PATH = '/data/adb/service.d/omk-fixprops.sh';
const CONFIG_PATH = CONFIG_DIR + '/config.toml';
const INJECTOR_PATH = CONFIG_DIR + '/injector.toml';
const KEYBOX_PATH = CONFIG_DIR + '/keybox.xml';
const CONFIG_MARK = '===CONFIG===';
const INJECTOR_MARK = '===INJECTOR===';

const LOG_LEVELS = ['off', 'error', 'warn', 'info', 'debug', 'trace'];
const INJECTOR_LOG_LEVELS = ['off', 'error', 'warn', 'warning', 'info', 'debug', 'trace'];
const LEVEL_NOTES = {
  off: '不写日志：最安静，但出问题时也不留线索',
  error: '只记录错误',
  warn: '记录错误和警告',
  warning: '记录错误和警告（等同于 warn）',
  info: '记录常规信息（关键流程）',
  debug: '调试信息：模块默认值，反馈问题时最有用',
  trace: '最详细，日志量最大',
};
const ALWAYS_ROUTED = [
  'com.google.android.gsf',
  'com.google.android.gms',
  'com.android.vending',
];
const DEFAULT_KEYBOX_URL =
  'https://gist.githubusercontent.com/wuhudiao/c3f7ee2cc3a10663fa53c719b567b2d8/raw/keybox.xml';

let MODULE_DIR = '/data/adb/modules/oh_my_keymint';


const ICONS = {
  shield: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  lock: 'M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z',
  explore: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z',
  grid: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  snippet: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  key: 'M12.65 10A6 6 0 1 0 7 20a6 6 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 17a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
  restart: 'M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
  folder: 'M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z',
  cloud: 'M19.35 10.04A7.49 7.49 0 0 0 12 4a7.48 7.48 0 0 0-6.64 4.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13a5 5 0 0 0 .35-9.96zM17 13l-5 5-5-5h3V9h4v4h3z',
  chevron: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z',
  check: 'M9 16.17 4.83 12 3.41 13.41 9 19 21 7l-1.41-1.41z',
  visibilityOff: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
};

function svgIcon(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';
}


const hasKsu = typeof ksu !== 'undefined' && ksu !== null && typeof ksu.exec === 'function';
let cbSeq = 0;

function sh(cmd, options) {
  if (!hasKsu) return Promise.reject(new Error('这个页面需要在 KernelSU 管理器里打开'));
  return new Promise((resolve, reject) => {
    const name = '__ksu_cb_' + (++cbSeq);
    window[name] = (code, out, err) => {
      delete window[name];
      if (code === 0) resolve(out || '');
      else reject(new Error(String(err || '').trim() || '命令执行失败（exit ' + code + '）'));
    };
    try {
      ksu.exec(cmd, options ? JSON.stringify(options) : null, 'window.' + name);
    } catch (e) {
      delete window[name];
      reject(e);
    }
  });
}

function toast(message) {
  if (!message) return;
  if (hasKsu && typeof ksu.toast === 'function') {
    try { ksu.toast(message); return; } catch (e) {  }
  }
  const box = document.getElementById('toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { box.hidden = true; }, 2200);
}

function shRaw(command, options) {
  if (!hasKsu) return Promise.reject(new Error('这个页面需要在 KernelSU 管理器里打开'));
  return new Promise((resolve, reject) => {
    const name = '__ksu_cb_' + (++cbSeq);
    window[name] = (code, out, err) => {
      delete window[name];
      resolve({ code: Number(code), out: out || '', err: err || '' });
    };
    try {
      ksu.exec(command, options ? JSON.stringify(options) : null, 'window.' + name);
    } catch (e) {
      delete window[name];
      reject(e);
    }
  });
}


function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  const units = ['K', 'M', 'G', 'T'];
  let value = bytes;
  let index = -1;
  do { value /= 1024; index++; } while (value >= 1024 && index < units.length - 1);
  return (value < 10 ? value.toFixed(1) : Math.round(value)) + units[index];
}

function quoteShell(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}


function statusScript() {
  return [
    '[ -d ' + MODULE_DIR + ' ] && echo installed=1 || echo installed=0',
    '[ -d ' + MODULE_DIR + ' ] && [ ! -e ' + MODULE_DIR + '/disable ] && echo enabled=1 || echo enabled=0',
    "sed -n 's/^version=/version=/p' " + MODULE_DIR + '/module.prop 2>/dev/null | head -n 1',
    '[ -f ' + FIX_PROPS_PATH + ' ] && echo fixprops=1 || echo fixprops=0',
    '[ -s ' + STATE_DIR + '/keymint-daemon.pid ] && kill -0 $(cat ' + STATE_DIR + '/keymint-daemon.pid) 2>/dev/null && echo keymint=1 || echo keymint=0',
    '[ -s ' + STATE_DIR + '/injector-daemon.pid ] && kill -0 $(cat ' + STATE_DIR + '/injector-daemon.pid) 2>/dev/null && echo injector=1 || echo injector=0',
    '[ -f ' + CONFIG_PATH + ' ] && echo configsize=$(stat -c %s ' + CONFIG_PATH + ') || echo configsize=-1',
    '[ -f ' + INJECTOR_PATH + ' ] && echo injectorsize=$(stat -c %s ' + INJECTOR_PATH + ') || echo injectorsize=-1',
    '[ -f ' + KEYBOX_PATH + ' ] && echo keyboxsize=$(stat -c %s ' + KEYBOX_PATH + ') || echo keyboxsize=-1',
    'echo ' + CONFIG_MARK,
    'cat ' + CONFIG_PATH + ' 2>/dev/null',
    'echo ' + INJECTOR_MARK,
    'cat ' + INJECTOR_PATH + ' 2>/dev/null',
  ].join('\n');
}

async function readStatus() {
  const raw = await sh(statusScript());
  const head = raw.split(CONFIG_MARK)[0] || '';
  const fields = {};
  for (const line of head.split('\n')) {
    const at = line.indexOf('=');
    if (at > 0) fields[line.slice(0, at)] = line.slice(at + 1);
  }
  const config = raw.includes(CONFIG_MARK)
    ? raw.split(CONFIG_MARK)[1].split(INJECTOR_MARK)[0].replace(/^\n/, '')
    : '';
  const injector = raw.includes(INJECTOR_MARK)
    ? raw.split(INJECTOR_MARK)[1].replace(/^\n/, '')
    : '';
  const scoop = parseScoop(injector);
  const size = Number(fields.keyboxsize);
  return {
    installed: fields.installed === '1',
    version: fields.version || '',
    enabled: fields.enabled === '1',
    keymintRunning: fields.keymint === '1',
    injectorRunning: fields.injector === '1',
    fixProps: fields.fixprops === '1',
    scoop,
    logLevel: logLevelOf(config),
    injectorLogLevel: logLevelOf(injector),
    keyboxExists: Number.isFinite(size) && size >= 0,
    keyboxSize: size > 0 ? size : 0,
  };
}

function logLevelOf(text) {
  const line = findValueLine(text, 'log_level');
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
}

function findValueLine(text, key) {
  for (const line of String(text).split('\n')) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith(key) && trimmed.slice(key.length).trimStart().startsWith('=')) return line;
  }
  return null;
}


function parseScoop(text) {
  const range = findScoopArray(text);
  if (!range) return [];
  const inner = text.slice(range[0] + 1, range[1]);
  const out = [];
  const re = /"([^"]*)"/g;
  let m;
  while ((m = re.exec(inner)) !== null) out.push(m[1]);
  return out;
}

function findScoopArray(text) {
  let at = 0;
  for (const line of String(text).split('\n')) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('#')) {
      const rest = trimmed.replace(/^scoop/, '');
      if (rest !== trimmed && rest.trimStart().startsWith('=')) {
        const open = line.indexOf('[');
        if (open >= 0) {
          const close = matchingBracket(text, at + open);
          if (close !== null) return [at + open, close];
        }
      }
    }
    at += line.length + 1;
  }
  return null;
}

function matchingBracket(text, open) {
  let depth = 0;
  let quote = null;
  let i = open;
  while (i < text.length) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"') i++;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return null;
}

function setScoop(text, packages) {
  const quoted = packages.map((p) => '"' + String(p).replace(/"/g, '') + '"');
  const range = findScoopArray(text);
  if (!range) {
    const at = firstTableHeader(text);
    const head = text.slice(0, at).trimEnd();
    const tail = text.slice(at);
    let out = '';
    if (head) out += head + '\n\n';
    out += 'scoop = [' + quoted.join(', ') + ']\n';
    if (tail) out += '\n' + tail;
    return out;
  }
  const [open, close] = range;
  let inner;
  if (text.slice(open, close).includes('\n')) {
    const line = text.slice(0, open).split('\n').pop();
    const indent = line.length - line.trimStart().length;
    const pad = ' '.repeat(indent + 2);
    inner = '\n' + quoted.map((q) => pad + q).join(',\n') + '\n' + ' '.repeat(indent);
  } else {
    inner = quoted.join(', ');
  }
  return text.slice(0, open) + '[' + inner + ']' + text.slice(close + 1);
}

function firstTableHeader(text) {
  let at = 0;
  for (const line of String(text).split('\n')) {
    if (line.trimStart().startsWith('[')) return at;
    at += line.length + 1;
  }
  return text.length;
}


function replaceLogLevel(text, level) {
  let replaced = false;
  const lines = String(text).split('\n');
  const out = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!replaced && !trimmed.startsWith('#') && trimmed.startsWith('log_level') && trimmed.includes('=')) {
      const indent = line.slice(0, line.length - trimmed.length);
      out.push(indent + 'log_level = "' + level + '"');
      replaced = true;
    } else {
      out.push(line);
    }
  }
  if (!replaced) return null;
  return out.join('\n');
}


async function readFile(path) {
  return await sh('cat ' + path + ' 2>/dev/null');
}

async function writeFile(path, content, mode = '600', uid = KEYSTORE_UID) {
  const encoded = b64utf8(content);
  const script = [
    'if [ -f ' + path + ' ]; then cp -a ' + path + ' ' + path + '.new; else : > ' + path + '.new; fi',
    "printf '%s' " + quoteShell(encoded) + ' | base64 -d > ' + path + '.new || exit 1',
    'chown ' + uid + ':' + uid + ' ' + path + '.new 2>/dev/null',
    'chmod ' + mode + ' ' + path + '.new',
    'mv -f ' + path + '.new ' + path,
    'echo ok',
  ].join('\n');
  const out = await sh(script);
  if (!out.includes('ok')) throw new Error('写入 ' + path + ' 失败');
}

async function isFile(path) {
  return (await sh('[ -f ' + path + ' ] && echo 1 || echo 0')).trim() === '1';
}


async function setFixProps(enable) {
  if (enable) {
    const response = await fetch('omk-fixprops.sh');
    if (!response.ok) throw new Error('读不到 omk-fixprops.sh（HTTP ' + response.status + '）');
    const script = await response.text();
    await writeFile(FIX_PROPS_PATH, script, '755', 0);
  } else {
    await sh('rm -f ' + FIX_PROPS_PATH);
  }
  return await isFile(FIX_PROPS_PATH);
}

async function saveScoop(packages) {
  const updated = setScoop(await readFile(INJECTOR_PATH), packages);
  if (findScoopArray(updated) === null) throw new Error('写出来的 injector.toml 里没有合法的 scoop 数组');
  await writeFile(INJECTOR_PATH, updated);
}

async function saveLogLevel(which, level) {
  const path = which === 'config' ? CONFIG_PATH : which === 'injector' ? INJECTOR_PATH : null;
  if (!path) throw new Error('未知的配置文件：' + which);
  const allowed = which === 'injector' ? INJECTOR_LOG_LEVELS : LOG_LEVELS;
  if (!allowed.includes(level)) throw new Error('日志级别只能是 ' + allowed.join(' / ') + ' 之一');
  const updated = replaceLogLevel(await readFile(path), level);
  if (updated === null) throw new Error(path.split('/').pop() + ' 里没有 log_level 这一行');
  await writeFile(path, updated);
}

async function applyKeyboxContent(content) {
  if (!content.includes('<AndroidAttestation') || !content.includes('<PrivateKey')) {
    throw new Error('这个文件不是有效的 keybox.xml：缺少 <AndroidAttestation> 或 <PrivateKey>');
  }
  await writeFile(KEYBOX_PATH, content);
}

async function restart(what) {
  const flag = what === 'keymint' ? 'restart.keymint'
    : what === 'injector' ? 'restart.injector'
      : what === 'all' ? 'restart.all' : null;
  if (!flag) throw new Error('未知的重启目标：' + what);
  const dir = (await sh('[ -d ' + STATE_DIR + ' ] && echo 1 || echo 0')).trim() === '1';
  if (!dir) throw new Error(STATE_DIR + ' 不存在，模块可能没有在运行');
  await sh(': > ' + STATE_DIR + '/' + flag + ' 2>/dev/null || touch ' + STATE_DIR + '/' + flag);
}

async function downloadKeybox(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) throw new Error('下载失败：HTTP ' + response.status);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}


async function listApps() {
  const names = JSON.parse(ksu.listPackages('user'));
  const info = JSON.parse(ksu.getPackagesInfo(JSON.stringify(names)));
  return info
    .filter((a) => a && a.packageName && !a.error && !a.isSystem)
    .map((a) => ({ pkg: a.packageName, label: a.appLabel || a.packageName }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN', { sensitivity: 'base' }));
}


const page = document.getElementById('page');
const overlay = document.getElementById('overlay');
const dialogBox = document.getElementById('dialog');
const tabbar = document.getElementById('tabbar');


const ROUTES = [
  { id: 'keymint', label: 'keyMint', icon: 'shield' },
  { id: 'hideapp', label: '隐藏应用列表', icon: 'visibilityOff' },
];
let route = 'keymint';

function renderTabbar() {
  tabbar.hidden = false;
  tabbar.querySelectorAll('.tab').forEach((node) => node.remove());
  for (const item of ROUTES) {
    const button = el('button', 'tab' + (route === item.id ? ' active' : ''));
    button.type = 'button';
    button.dataset.route = item.id;
    const icon = el('span', 'tab-icon');
    icon.innerHTML = svgIcon(item.icon);
    button.appendChild(icon);
    button.appendChild(el('span', 'tab-label', item.label));
    button.addEventListener('click', () => {
      if (route === item.id) return;
      route = item.id;
      closeDialog();
      renderRoute();
    });
    tabbar.appendChild(button);
  }
  moveTabbarPill();
}

function moveTabbarPill() {
  const pill = tabbar.querySelector('.tabbar-pill');
  const active = tabbar.querySelector('.tab.active');
  if (!pill || !active) return;
  pill.style.width = active.offsetWidth + 'px';
  pill.style.transform = 'translateX(' + active.offsetLeft + 'px)';
}

window.addEventListener('resize', moveTabbarPill);

function renderRoute() {
  renderTabbar();
  if (route === 'hideapp') renderHideApp();
  else refresh();
}

function iconNode(name) {
  const box = el('div', 'icon');
  box.innerHTML = svgIcon(name);
  return box;
}

function row(entry) {
  const node = el('div', 'row' + (entry.onClick ? ' pressable' : ''));
  node.appendChild(iconNode(entry.icon));
  const body = el('div', 'body');
  body.appendChild(el('div', 'title', entry.title));
  if (entry.summary) body.appendChild(el('div', 'summary', entry.summary));
  node.appendChild(body);
  if (entry.checked !== undefined) {
    const sw = el('div', 'switch' + (entry.checked ? ' on' : ''));
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(!!entry.checked));
    node.appendChild(sw);
  } else if (entry.onClick) {
    const trailing = el('div', 'trailing');
    trailing.innerHTML = '<span class="chevron">' + svgIcon('chevron') + '</span>';
    node.appendChild(trailing);
  }
  if (entry.onClick) node.addEventListener('click', entry.onClick);
  return node;
}

function card(entries) {
  const node = el('div', 'card');
  entries.forEach((e) => node.appendChild(row(e)));
  return node;
}

function group(title, entries) {
  const fragment = document.createDocumentFragment();
  if (title) fragment.appendChild(el('div', 'small-title', title));
  fragment.appendChild(card(entries));
  return fragment;
}

function renderLoading(message) {
  page.replaceChildren();
  const box = el('div', 'card');
  box.appendChild(row({ icon: 'shield', title: message || '读取中…' }));
  page.appendChild(box);
}

function render(state, error) {
  page.replaceChildren();

  if (error) {
    page.appendChild(group(null, [{
      icon: 'shield', title: '读取失败', summary: error, onClick: refresh,
    }]));
    return;
  }
  if (!state) {
    renderLoading();
    return;
  }
  if (!state.installed) {
    page.appendChild(group(null, [{
      icon: 'shield',
      title: '没有安装 安卓设备隐藏bl',
      summary: '模块 id：oh_my_keymint。装好并重启一次后这里会出现配置项。',
      onClick: refresh,
    }]));
    return;
  }

  const running = '● 运行中';
  const notRunning = '● 未运行';
  const keyboxSummary = state.keyboxExists
    ? formatSize(state.keyboxSize) + ' 的 keybox.xml'
    : '还没有 keybox.xml';

  page.appendChild(group(null, [{
    icon: 'shield',
    title: '安卓设备隐藏bl',
    summary: state.version + ' · ' + (state.enabled ? '已启用' : '已禁用'),
  }]));

  page.appendChild(group('状态', [
    { icon: 'lock', title: 'keymint 守护进程', summary: state.keymintRunning ? running : notRunning },
    { icon: 'explore', title: 'injector 守护进程', summary: state.injectorRunning ? running : notRunning },
  ]));

  page.appendChild(group('功能', [
    {
      icon: 'shield',
      title: '修正系统属性',
      summary: state.fixProps
        ? '已装到 /data/adb/service.d，开机自动校正属性'
        : '开机时把已解锁/可调试那面的属性改回正常机器的样子',
      checked: state.fixProps,
      onClick: () => act(async () => {
        const on = await setFixProps(!state.fixProps);
        return on ? '已启用：开机时校正系统属性' : '已关闭并删除该脚本';
      }),
    },
    {
      icon: 'grid',
      title: '选择软件',
      summary: state.scoop.length + ' 个应用走 OMK；改动对新请求立即生效，无需重启',
      onClick: () => openAppsDialog(state),
    },
    {
      icon: 'snippet',
      title: '日志输出级别',
      summary: 'keymint ' + (state.logLevel || '?') + ' · injector ' + (state.injectorLogLevel || '?'),
      onClick: () => openLevelDialog(state),
    },
    {
      icon: 'key',
      title: 'keybox',
      summary: keyboxSummary,
      onClick: () => openKeyboxDialog(state),
    },
  ]));

  page.appendChild(group('重启', [
    { icon: 'restart', title: '重启 keymint', onClick: () => act(() => doRestart('keymint')) },
    { icon: 'restart', title: '重启 injector', onClick: () => act(() => doRestart('injector')) },
    { icon: 'restart', title: '全部重启', onClick: () => act(() => doRestart('all')) },
  ]));
}

async function doRestart(what) {
  await restart(what);
  return what === 'all' ? '已请求全部重启' : '已请求重启 ' + what;
}


function closeDialog() {
  overlay.hidden = true;
  dialogBox.replaceChildren();
}

let dialogDismissable = true;

function openDialog({ title, summary, body, actions, centered, fillActions, dismissable = true }) {
  dialogBox.replaceChildren();
  dialogDismissable = dismissable;
  if (title) dialogBox.appendChild(el('div', 'dialog-title', title));
  if (summary) dialogBox.appendChild(el('div', 'dialog-summary', summary));
  if (body) {
    const box = el('div', 'dialog-body');
    box.appendChild(body);
    dialogBox.appendChild(box);
  }
  const bar = el('div', 'dialog-actions' + (centered ? '' : ' end') + (fillActions ? ' fill' : ''));
  (actions || []).forEach((a) => {
    const button = el('button', 'btn' + (a.primary ? ' primary' : ''), a.text);
    button.addEventListener('click', a.onClick);
    bar.appendChild(button);
  });
  dialogBox.appendChild(bar);
  overlay.hidden = false;
}

overlay.addEventListener('click', (event) => {
  if (event.target === overlay && dialogDismissable) closeDialog();
});

function actionButton(text, onClick, primary) {
  return { text, onClick, primary };
}

function mkBtn(text, onClick, primary) {
  const button = el('button', 'btn' + (primary ? ' primary' : ''), text);
  button.addEventListener('click', onClick);
  return button;
}


async function openAppsDialog(state) {
  const chosen = new Set([...state.scoop, ...ALWAYS_ROUTED]);
  let apps = null;
  let loadError = null;
  let query = '';

  const body = el('div', 'dialog-body');
  const searchWrap = el('div');
  searchWrap.appendChild(el('label', 'field-label', '搜索名称或包名'));
  const search = el('input', 'field');
  search.type = 'search';
  search.placeholder = '搜索名称或包名';
  searchWrap.appendChild(search);
  body.appendChild(searchWrap);
  const listBox = el('div', 'list');
  body.appendChild(listBox);

  const summaryNode = el('div', 'dialog-summary');

  function paintList() {
    listBox.replaceChildren();
    if (loadError) {
      listBox.appendChild(el('div', 'muted danger', loadError));
      return;
    }
    if (apps === null) {
      listBox.appendChild(el('div', 'spinner'));
      return;
    }
    const q = query.trim().toLowerCase();
    const shown = apps.filter((a) =>
      !q || a.label.toLowerCase().includes(q) || a.pkg.toLowerCase().includes(q));
    if (!shown.length) {
      listBox.appendChild(el('div', 'muted', '没有可显示的应用'));
      return;
    }
    shown.forEach((app) => {
      const on = chosen.has(app.pkg);
      const line = el('div', 'row pressable');
      const icon = document.createElement('img');
      icon.className = 'app-icon';
      icon.loading = 'lazy';
      icon.alt = '';
      icon.src = 'ksu://icon/' + app.pkg;
      icon.addEventListener('error', () => { icon.style.visibility = 'hidden'; });
      line.appendChild(icon);
      const text = el('div', 'body');
      text.appendChild(el('div', 'title', app.label));
      text.appendChild(el('div', 'summary', app.pkg));
      line.appendChild(text);
      const box = el('div', 'checkbox' + (on ? ' on' : ''));
      box.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + ICONS.check + '"/></svg>';
      line.appendChild(box);
      line.addEventListener('click', () => {
        if (chosen.has(app.pkg)) chosen.delete(app.pkg); else chosen.add(app.pkg);
        paintList();
        paintSummary();
      });
      listBox.appendChild(line);
    });
  }

  function paintSummary() {
    summaryNode.textContent = '已选 ' + chosen.size + ' 个';
  }

  search.addEventListener('input', () => { query = search.value; paintList(); });
  paintSummary();

  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.appendChild(el('div', 'dialog-title', '路由到 OMK 的应用'));
  dialog.appendChild(summaryNode);
  dialog.appendChild(body);
  const bar = el('div', 'dialog-actions');
  bar.appendChild(mkBtn('全选', () => {
    (apps || []).forEach((a) => chosen.add(a.pkg));
    paintList();
    paintSummary();
  }));
  bar.appendChild(mkBtn('取消', closeDialog));
  bar.appendChild(mkBtn('保存', () => {
    closeDialog();
    act(async () => {
      await saveScoop([...chosen]);
      return '已保存 ' + chosen.size + ' 个应用';
    });
  }, true));
  dialog.appendChild(bar);

  dialogBox.replaceChildren(dialog);
  overlay.hidden = false;

  try {
    apps = await listApps();
  } catch (e) {
    apps = [];
    loadError = e.message || String(e);
  }
  paintList();
}


function openLevelDialog(state) {
  const body = el('div', 'dialog-body');

  const section = (title, levels, current, which) => {
    body.appendChild(el('div', 'small-title', title));
    const box = el('div', 'card');
    levels.forEach((level) => {
      const line = el('div', 'row pressable');
      const text = el('div', 'body');
      text.appendChild(el('div', 'title', level + (level === current ? '（当前）' : '')));
      if (LEVEL_NOTES[level]) text.appendChild(el('div', 'summary', LEVEL_NOTES[level]));
      line.appendChild(text);
      const radio = el('div', 'radio' + (level === current ? ' on' : ''));
      line.appendChild(radio);
      line.addEventListener('click', () => {
        closeDialog();
        act(async () => {
          await saveLogLevel(which, level);
          return which === 'injector'
            ? 'injector 日志级别已设为 ' + level + '，立即生效'
            : 'keymint 日志级别已设为 ' + level + '，重启 keymint 后完全生效';
        });
      });
      box.appendChild(line);
    });
    body.appendChild(box);
  };

  section('keymint（config.toml）', LOG_LEVELS, state.logLevel, 'config');
  section('injector（injector.toml）', INJECTOR_LOG_LEVELS, state.injectorLogLevel, 'injector');

  openDialog({
    title: '日志输出级别',
    body,
    centered: true,
    actions: [actionButton('取消', closeDialog)],
  });
}


function openKeyboxDialog(state) {
  const body = el('div');
  body.appendChild(row({
    icon: 'folder',
    title: '本地选择',
    summary: '跳到文件管理器选一个 keybox.xml',
    onClick: pickWithFileManager,
  }));
  body.appendChild(row({
    icon: 'cloud',
    title: '远程更新',
    summary: '从下面的地址下载 keybox.xml，验证通过后替换当前密钥。',
    onClick: openRemoteKeyboxDialog,
  }));

  openDialog({
    title: 'keybox',
    summary: state.keyboxExists
      ? formatSize(state.keyboxSize) + ' 的 keybox.xml'
      : '还没有 keybox.xml',
    body,
    centered: true,
    actions: [actionButton('取消', closeDialog)],
  });
}

function pickWithFileManager() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '*/*';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    act(async () => {
      let text;
      try {
        text = await file.text();
      } catch (e) {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('这个文件读不出来（' + file.name + '）'));
          reader.readAsText(file);
        });
      }
      await applyKeyboxContent(text);
      return '已替换 keybox';
    });
  });
  input.addEventListener('cancel', () => {  });
  input.click();
}

function openRemoteKeyboxDialog() {
  const body = el('div');
  body.appendChild(el('label', 'field-label', 'keybox.xml 的下载地址'));
  const field = el('input', 'field');
  field.type = 'url';
  field.value = DEFAULT_KEYBOX_URL;
  field.spellcheck = false;
  body.appendChild(field);

  openDialog({
    title: '远程更新',
    summary: '从下面的地址下载 keybox.xml，验证通过后替换当前密钥。',
    body,
    actions: [
      actionButton('开始更新', () => {
        const url = field.value.trim();
        if (!/^https:\/\//i.test(url)) {
          toast('地址必须以 https:// 开头');
          return;
        }
        closeDialog();
        act(async () => {
          await applyKeyboxContent(await downloadKeybox(url));
          return '远程密钥已更新';
        });
      }, true),
      actionButton('取消', closeDialog),
    ],
  });
}


const HMA_SCRIPT_PATH = '/data/adb/ksu/hma-config.sh';
const SCENE_PACKAGE = 'com.omarea.vtools';

function renderHideApp() {
  page.replaceChildren();
  page.appendChild(group(null, [{
    icon: 'visibilityOff',
    title: '一键配置隐藏应用列表',
    summary: '为所有第三方应用写好 Hide My Applist 配置并让其重读',
    onClick: () => showHideAppPhase('pick', ''),
  }]));
}

async function detectManagerPackage() {
  const probes = [
    "dumpsys window 2>/dev/null | grep -m1 -E 'mCurrentFocus|mFocusedApp'",
    "dumpsys activity activities 2>/dev/null | grep -m1 -E 'mResumedActivity|topResumedActivity'",
  ];
  for (const cmd of probes) {
    let out = '';
    try { out = (await shRaw(cmd)).out; } catch (e) {  }
    const hit = String(out).match(/([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)\//);
    if (hit) return hit[1];
  }
  let list = '';
  try { list = (await shRaw("pm list packages -3 2>/dev/null | sed 's/^package://'")).out; } catch (e) {  }
  return String(list).split('\n').map((s) => s.trim()).filter(Boolean)
    .find((p) => /kernelsu|diksu/i.test(p)) || '';
}

async function runHideAppList(scene) {
  const response = await fetch('hma-oss-config.sh');
  if (!response.ok) throw new Error('读不到 hma-oss-config.sh（HTTP ' + response.status + '）');
  const script = await response.text();

  const wrote = await sh(
    "printf '%s' " + quoteShell(b64utf8(script)) + ' | base64 -d > ' + HMA_SCRIPT_PATH + ' || exit 1\n' +
    'chmod 700 ' + HMA_SCRIPT_PATH + '\necho ok'
  );
  if (!wrote.includes('ok')) throw new Error('写入 ' + HMA_SCRIPT_PATH + ' 失败');

  const manager = await detectManagerPackage();
  let env = 'HMA_MANAGER_PKG=' + quoteShell(manager) + ' ';
  if (scene) {
    env += 'HMA_EXTRA_EXCLUDE=' + quoteShell(SCENE_PACKAGE) + ' HMA_NO_ACCESSIBILITY=1 ';
  }

  const result = await shRaw(env + 'sh ' + HMA_SCRIPT_PATH);
  const text = [result.out, result.err].filter((s) => s.trim()).join('\n').trim();
  if (result.code !== 0) throw new Error(text || '命令执行失败');
  return text;
}

function showHideAppPhase(phase, text) {
  const body = el('div');
  if (phase === 'pick') {
    body.appendChild(el('div', 'dialog-text',
      '把还没配过的第三方应用加进 HMA-OSS 的隐藏范围，已配过的应用只补齐预设、别的字段不动，管理器自己也会从这些应用里隐藏掉。'));
    body.appendChild(el('div', 'dialog-text',
      'Scene 版本另外把 Scene 排除在范围外，且不勾选「无障碍功能」预设。'));
  } else if (phase === 'running') {
    body.appendChild(el('div', 'dialog-text', '正在写入配置…'));
  } else {
    body.appendChild(el('div', 'dialog-text', text || '已完成'));
  }

  const actions = [];
  if (phase === 'pick') {
    actions.push(actionButton('标准', () => startHideApp(false)));
    actions.push(actionButton('Scene', () => startHideApp(true)));
    actions.push(actionButton('取消', closeDialog));
  } else if (phase === 'done') {
    actions.push(actionButton('确定', closeDialog));
  }

  openDialog({
    title: '一键配置隐藏应用列表',
    body,
    fillActions: phase === 'pick',
    dismissable: phase !== 'running',
    actions,
  });
}

async function startHideApp(scene) {
  showHideAppPhase('running', '');
  let text;
  try {
    text = await runHideAppList(scene);
  } catch (e) {
    text = (e && e.message) ? e.message : String(e);
  }
  if (route !== 'hideapp') return;
  showHideAppPhase('done', text);
}


let busy = false;

function act(work) {
  if (busy) return;
  busy = true;
  Promise.resolve()
    .then(work)
    .then((message) => { if (message) toast(message); })
    .catch((e) => toast(e && e.message ? e.message : String(e)))
    .finally(() => { busy = false; refresh(); });
}

async function refresh() {
  if (route !== 'keymint') return;
  renderLoading();
  try {
    const state = await readStatus();
    render(state, null);
  } catch (e) {
    render(null, e && e.message ? e.message : String(e));
  }
}


(function boot() {
  try {
    if (hasKsu && typeof ksu.moduleInfo === 'function') {
      const info = JSON.parse(ksu.moduleInfo());
      if (info && info.moduleDir) MODULE_DIR = info.moduleDir;
    }
  } catch (e) {  }

  if (!hasKsu) {
    page.appendChild(group(null, [{
      icon: 'shield',
      title: '读取失败',
      summary: '这个页面要在 KernelSU 管理器的 WebUI 里打开',
    }]));
    return;
  }
  renderRoute();
})();