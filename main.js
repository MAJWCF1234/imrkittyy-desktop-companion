const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, clipboard, desktopCapturer, dialog, ipcMain, screen, powerMonitor, shell } = require('electron');
const { createMemoryEngine } = require('./memory-engine');
const { adaptMessagesForModel, buildModelProfiles, inferModelProfile, summarizeModelProfile } = require('./model-adapters');
const { createSidecarHub } = require('./sidecar-hub');
const { createContextMediaPicker } = require('./context-media');
const clientProfile = require('./client-profile.json');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
}

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.oga', '.flac', '.m4a', '.aac', '.opus']);
const DEFAULT_BASE_URL = clientProfile.defaultBaseUrl || 'http://127.0.0.1:1234/v1';
const LOCAL_FALLBACK_BASE_URL = clientProfile.fallbackBaseUrl || 'http://localhost:1234/v1';
/** LM Studio may spend minutes on extended thinking before the HTTP response completes (non-streaming). */
const MAI_STUDIO_CHAT_COMPLETION_TIMEOUT_MS = 5 * 60 * 1000;
const ANIMATION_EXTENSIONS = new Set(['.vrma']);
const LOCAL_ANIMATION_FOLDER = path.join(__dirname, 'animations');
const PIPER_ROOT = path.join(__dirname, 'tools', 'piper');
const PIPER_RUNTIME_DIR = path.join(PIPER_ROOT, 'runtime', 'piper');
const PIPER_EXE = path.join(PIPER_RUNTIME_DIR, 'piper.exe');
const PIPER_VOICE_DIR = path.join(PIPER_ROOT, 'voices');
const PIPER_DEFAULT_MODEL = path.join(PIPER_VOICE_DIR, 'en_US-hfc_female-medium.onnx');
const PIPER_DEFAULT_VOICE_LABEL = clientProfile.voiceLabel || 'Mai local voice';
const POWERSHELL_EXE = process.platform === 'win32' && process.env.SystemRoot
  ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  : 'powershell.exe';
const CLIENT_DATA_ROOT = path.join(__dirname, 'client-data');
const CLIENT_NOTES_PATH = path.join(CLIENT_DATA_ROOT, 'notes.jsonl');
const CLIENT_REMINDERS_PATH = path.join(CLIENT_DATA_ROOT, 'reminders.jsonl');
const CLIENT_CLIPBOARD_PATH = path.join(CLIENT_DATA_ROOT, 'clipboard-history.jsonl');
const CLIENT_SCREENSHOT_DIR = path.join(CLIENT_DATA_ROOT, 'screenshots');
const CLIENT_CALENDAR_DIR = path.join(CLIENT_DATA_ROOT, 'calendar');
const CLIENT_MACROS_PATH = path.join(CLIENT_DATA_ROOT, 'macros.jsonl');
const CLIENT_PLAYLISTS_PATH = path.join(CLIENT_DATA_ROOT, 'playlists.json');
const ANIMATION_LIBRARY_CANDIDATES = [
  {
    source: 'Bundled Motion Pack',
    folderPath: LOCAL_ANIMATION_FOLDER
  },
  {
    source: 'Expansion VRMA MotionPack',
    folderPath: 'L:\\3D Assets\\Collections\\VRMA MotionPack\\vrma'
  },
  {
    source: 'Legacy VRMA Pack',
    folderPath: 'F:\\SteamLibrary\\steamapps\\common\\n.e.k.o\\resources\\bin\\static\\vrm\\animation'
  },
  {
    source: 'Warudo Character Animations',
    folderPath: 'G:\\SteamLibrary\\steamapps\\common\\Warudo\\Warudo_Data\\StreamingAssets\\CharacterAnimations'
  },
  {
    source: 'Warudo Character Animation Profiles',
    folderPath: 'G:\\SteamLibrary\\steamapps\\common\\Warudo\\Warudo_Data\\StreamingAssets\\CharacterAnimationProfiles'
  }
];

const FOREGROUND_WINDOW_SCRIPT = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class ForegroundWindowInfo {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@;
$handle = [ForegroundWindowInfo]::GetForegroundWindow();
$builder = New-Object System.Text.StringBuilder 512;
[void][ForegroundWindowInfo]::GetWindowText($handle, $builder, $builder.Capacity);
$pid = 0;
[void][ForegroundWindowInfo]::GetWindowThreadProcessId($handle, [ref]$pid);
$processName = "";
try {
  $processName = (Get-Process -Id $pid -ErrorAction Stop).ProcessName;
} catch {}
[pscustomobject]@{
  title = $builder.ToString();
  processName = $processName
} | ConvertTo-Json -Compress
`;

const AUDIO_ENDPOINT_SCRIPT = `
$names = @();
try {
  $names = Get-PnpDevice -Class AudioEndpoint -Status OK | Select-Object -ExpandProperty FriendlyName;
} catch {}
$names | ConvertTo-Json -Compress
`;

let mainWindow;
let windowModeState = {
  gameCam: false,
  presence: false,
  normalBounds: null
};
let systemSenseTimer = null;
let systemSenseState = {
  activeWindowTitle: '',
  activeProcessName: '',
  idleState: 'active',
  idleSeconds: 0,
  locked: false,
  headphonesConnected: false,
  audioEndpoints: [],
  lastEventType: 'boot',
  updatedAt: null
};
const memoryEngine = createMemoryEngine({
  rootDir: __dirname
});
const sidecarHub = createSidecarHub({
  memoryEngine
});
const contextMediaPicker = createContextMediaPicker();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(rawUrl) {
  let url = (rawUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');

  if (!/\/v1$/i.test(url)) {
    url = `${url}/v1`;
  }

  return url;
}

function buildBaseUrlCandidates(rawUrl) {
  const explicitUrl = String(rawUrl || '').trim();
  const normalizedDefault = normalizeBaseUrl(DEFAULT_BASE_URL);
  const normalizedFallback = normalizeBaseUrl(LOCAL_FALLBACK_BASE_URL);
  const normalizedExplicit = explicitUrl ? normalizeBaseUrl(explicitUrl) : '';
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (url) => {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    candidates.push(url);
  };

  if (!normalizedExplicit) {
    pushCandidate(normalizedDefault);
    pushCandidate(normalizedFallback);
    return candidates;
  }

  pushCandidate(normalizedExplicit);

  if (normalizedExplicit === normalizedDefault || normalizedExplicit === normalizedFallback) {
    pushCandidate(normalizedDefault);
    pushCandidate(normalizedFallback);
  }

  return candidates;
}

async function fetchModelCatalog(config = {}, options = {}) {
  const candidates = buildBaseUrlCandidates(config?.baseUrl);
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const payload = await fetchJson(`${baseUrl}/models`, {
        headers: buildHeaders(config?.apiKey),
        timeoutMs: 8000,
        signal: options.signal
      });
      return { baseUrl, payload };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Unable to reach ${clientProfile.studioName || 'LM Studio'}.`);
}

async function ensureClientDataRoot() {
  await fs.mkdir(CLIENT_DATA_ROOT, { recursive: true });
}

async function appendJsonLine(filePath, entry) {
  await ensureClientDataRoot();
  await fs.appendFile(filePath, `${JSON.stringify({ ...entry, createdAt: new Date().toISOString() })}\n`, 'utf8');
}

function escapeIcsText(text = '') {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toIcsStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slugifyFilePart(text = 'mai') {
  return String(text || 'mai')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'mai';
}

function parseLooseDateTime(rawWhen = '') {
  const value = String(rawWhen || '').trim();
  if (!value) {
    return null;
  }

  const relative = value.match(/\bin\s+(\d+(?:\.\d+)?)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b/i);
  if (relative) {
    const amount = Number.parseFloat(relative[1]);
    const unit = relative[2].toLowerCase();
    const multiplier = unit.startsWith('day') ? 86400000 : unit.startsWith('hour') || unit.startsWith('hr') ? 3600000 : 60000;
    return new Date(Date.now() + amount * multiplier);
  }

  const dayWord = value.match(/\b(today|tomorrow)\b/i)?.[1]?.toLowerCase();
  if (dayWord) {
    const date = new Date();
    if (dayWord === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }
    const time = value.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    let hours = time ? Number.parseInt(time[1], 10) : 9;
    const minutes = time?.[2] ? Number.parseInt(time[2], 10) : 0;
    const meridiem = time?.[3]?.toLowerCase() || '';
    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

async function createCalendarReminder(payload = {}) {
  const text = String(payload.text || payload.title || '').trim() || 'Mai reminder';
  const whenText = String(payload.when || '').trim();
  const start = parseLooseDateTime(whenText) || new Date(Date.now() + 3600000);
  const end = new Date(start.getTime() + Math.max(5, Math.min(Number(payload.minutes) || 15, 240)) * 60000);
  const id = `${Date.now()}-${slugifyFilePart(text)}@mai-desktop-companion`;
  await fs.mkdir(CLIENT_CALENDAR_DIR, { recursive: true });
  const outputPath = path.join(CLIENT_CALENDAR_DIR, `${slugifyFilePart(text)}-${start.getTime()}.ics`);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mai Desktop Companion//imrkittyy//EN',
    'BEGIN:VEVENT',
    `UID:${id}`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escapeIcsText(text)}`,
    `DESCRIPTION:${escapeIcsText(`Created by Mai. Original time text: ${whenText || 'not specified'}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n');
  await fs.writeFile(outputPath, ics, 'utf8');
  await appendJsonLine(CLIENT_REMINDERS_PATH, {
    text,
    when: whenText || start.toLocaleString(),
    calendarFile: outputPath
  });
  return { message: 'Calendar reminder saved.', path: outputPath, text, start: start.toISOString() };
}

async function readJsonLines(filePath, limit = 20) {
  const text = await fs.readFile(filePath, 'utf8').catch(() => '');
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-limit)
    .reverse();
}

async function collectFileMatches(rootPath, query, options = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const root = path.resolve(rootPath || app.getPath('home'));
  const maxResults = Math.max(1, Math.min(Number(options.maxResults) || 25, 100));
  const maxVisited = Math.max(200, Math.min(Number(options.maxVisited) || 3500, 12000));
  const results = [];
  let visited = 0;

  async function walk(folder) {
    if (visited >= maxVisited || results.length >= maxResults) {
      return;
    }

    const entries = await fs.readdir(folder, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (visited >= maxVisited || results.length >= maxResults) {
        return;
      }
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
        continue;
      }
      visited += 1;
      const fullPath = path.join(folder, entry.name);
      if (entry.name.toLowerCase().includes(normalizedQuery)) {
        results.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'folder' : 'file'
        });
      }
      if (entry.isDirectory()) {
        await walk(fullPath);
      }
    }
  }

  await walk(root);
  return { root, query: normalizedQuery, results, visited, truncated: visited >= maxVisited };
}

async function buildCleanupPlan(rootPath) {
  const root = path.resolve(rootPath || app.getPath('downloads'));
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const groups = {
    screenshots: [],
    documents: [],
    images: [],
    audio: [],
    video: [],
    archives: [],
    installers: [],
    other: []
  };
  const extGroups = [
    ['screenshots', /\.(png|jpg|jpeg|webp)$/i, /screenshot|screen shot|capture/i],
    ['documents', /\.(pdf|docx?|xlsx?|pptx?|txt|md)$/i],
    ['images', /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i],
    ['audio', /\.(mp3|wav|flac|m4a|ogg|opus)$/i],
    ['video', /\.(mp4|mov|mkv|webm|avi)$/i],
    ['archives', /\.(zip|7z|rar|tar|gz)$/i],
    ['installers', /\.(exe|msi)$/i]
  ];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const match = extGroups.find(([, extensionPattern, namePattern]) => {
      const name = entry.name;
      return extensionPattern.test(name) && (!namePattern || namePattern.test(name));
    });
    groups[match?.[0] || 'other'].push(entry.name);
  }

  return { root, groups, destructive: false };
}

async function readLocalDocument(filePath) {
  const rawPath = String(filePath || '').trim();
  if (!rawPath) {
    throw new Error('Tell me which local document to read.');
  }
  const target = path.resolve(rawPath);
  const extension = path.extname(target).toLowerCase();
  const textExtensions = new Set(['.txt', '.md', '.json', '.csv', '.tsv', '.log', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml']);
  if (!textExtensions.has(extension)) {
    return {
      path: target,
      supported: false,
      message: `I can read text-like documents directly right now. For ${extension || 'that file type'}, convert/export to txt, md, csv, or json first.`
    };
  }
  const stat = await fs.stat(target);
  if (!stat.isFile()) {
    throw new Error('That path is not a file.');
  }
  const raw = await fs.readFile(target, 'utf8');
  const text = raw.slice(0, 12000);
  return {
    path: target,
    supported: true,
    bytes: stat.size,
    truncated: raw.length > text.length,
    text
  };
}

function recognizeSpeechOnce(seconds = 7, locale = 'en-US') {
  const timeoutSeconds = Math.max(3, Math.min(Number(seconds) || 7, 18));
  const normalizedLocale = String(locale || 'en-US').trim() || 'en-US';
  const script = `
Add-Type -AssemblyName System.Speech
Add-Type -AssemblyName System.Globalization
$culture = $null
try {
  $culture = New-Object System.Globalization.CultureInfo('${normalizedLocale}')
} catch {
  $culture = New-Object System.Globalization.CultureInfo('en-US')
}
try {
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
} catch {
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
}
$recognizer.SetInputToDefaultAudioDevice()
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$recognizer.LoadGrammar($grammar)
$result = $recognizer.Recognize([TimeSpan]::FromSeconds(${timeoutSeconds}))
if ($result) {
  [pscustomobject]@{ text = $result.Text; confidence = $result.Confidence } | ConvertTo-Json -Compress
} else {
  [pscustomobject]@{ text = ""; confidence = 0 } | ConvertTo-Json -Compress
}
$recognizer.Dispose()
`;
  return execPowerShellJson(script);
}

function resolveAppLaunchTarget(target) {
  const key = String(target || '').trim().toLowerCase();
  const common = {
    calculator: 'calc.exe',
    calc: 'calc.exe',
    notepad: 'notepad.exe',
    paint: 'mspaint.exe',
    explorer: 'explorer.exe',
    files: 'explorer.exe',
    downloads: app.getPath('downloads'),
    documents: app.getPath('documents'),
    music: app.getPath('music'),
    cmd: 'cmd.exe',
    powershell: POWERSHELL_EXE,
    terminal: 'wt.exe',
    settings: 'ms-settings:',
    'lm studio': 'LM Studio.exe',
    lmstudio: 'LM Studio.exe',
    steam: 'steam://open/main',
    discord: 'discord://-/channels/@me',
    browser: 'https://www.google.com',
    google: 'https://www.google.com'
  };
  return common[key] || target;
}

function listShortcutTargets() {
  return [
    { name: 'calculator', target: 'calc.exe' },
    { name: 'notepad', target: 'notepad.exe' },
    { name: 'paint', target: 'mspaint.exe' },
    { name: 'files', target: 'explorer.exe' },
    { name: 'downloads', target: app.getPath('downloads') },
    { name: 'documents', target: app.getPath('documents') },
    { name: 'music', target: app.getPath('music') },
    { name: 'settings', target: 'ms-settings:' },
    { name: 'terminal', target: 'wt.exe' },
    { name: 'powershell', target: POWERSHELL_EXE },
    { name: 'lm studio', target: 'LM Studio.exe' },
    { name: 'steam', target: 'steam://open/main' },
    { name: 'discord', target: 'discord://-/channels/@me' }
  ];
}

async function saveMacro(payload = {}) {
  const name = String(payload.name || '').trim();
  const target = String(payload.target || payload.command || '').trim();
  if (!name || !target) {
    throw new Error('Macros need a name and a safe app, URL, or file target.');
  }
  await appendJsonLine(CLIENT_MACROS_PATH, { name, target });
  return { message: `Macro "${name}" saved.`, path: CLIENT_MACROS_PATH, name, target };
}

async function listMacros() {
  return {
    macros: await readJsonLines(CLIENT_MACROS_PATH, 50),
    shortcuts: listShortcutTargets(),
    path: CLIENT_MACROS_PATH
  };
}

async function runMacro(name = '') {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) {
    throw new Error('Tell me which macro or shortcut to run.');
  }
  const shortcuts = listShortcutTargets();
  const shortcut = shortcuts.find((item) => item.name.toLowerCase() === wanted);
  if (shortcut) {
    return launchResolvedTarget(shortcut.target, shortcut.name);
  }
  const macros = await readJsonLines(CLIENT_MACROS_PATH, 100);
  const macro = macros.find((item) => String(item.name || '').trim().toLowerCase() === wanted);
  if (!macro) {
    return { message: `I do not have a macro named "${name}" yet.`, found: false };
  }
  return launchResolvedTarget(macro.target, macro.name);
}

async function launchResolvedTarget(rawTarget, label = '') {
  const target = resolveAppLaunchTarget(String(rawTarget || '').trim());
  if (!target) {
    throw new Error('Tell me what app, file path, or URL to open.');
  }
  if (/^(?:https?:|ms-settings:|steam:|discord:)/i.test(target)) {
    await shell.openExternal(target);
  } else if (/^[a-z0-9_. -]+\.exe$/i.test(target)) {
    const child = spawn(target, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
  } else {
    const result = await shell.openPath(target);
    if (result) {
      throw new Error(result);
    }
  }
  return { message: `Opened ${label || target}.`, target, label };
}

async function saveCurrentScreenshot() {
  await fs.mkdir(CLIENT_SCREENSHOT_DIR, { recursive: true });
  const cursorPoint = screen.getCursorScreenPoint();
  const targetDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: targetDisplay.size,
    fetchWindowIcons: false
  });
  const source = chooseScreenSource(sources);
  if (!source || source.thumbnail.isEmpty()) {
    throw new Error('Unable to capture the desktop.');
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(CLIENT_SCREENSHOT_DIR, `screenshot-${stamp}.png`);
  await fs.writeFile(outputPath, source.thumbnail.toPNG());
  return { outputPath };
}

async function listBundledModelFiles() {
  const modelRoot = path.join(__dirname, clientProfile.localModelFolder || 'models');
  const entries = await fs.readdir(modelRoot, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const fullPath = path.join(modelRoot, entry.name);
    const stat = await fs.stat(fullPath).catch(() => null);
    files.push({
      name: entry.name,
      path: fullPath,
      bytes: stat?.size || 0
    });
  }
  return files.sort((left, right) => right.bytes - left.bytes);
}

async function readPlaylistStore() {
  try {
    const raw = await fs.readFile(CLIENT_PLAYLISTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePlaylistStore(playlists = []) {
  await fs.mkdir(CLIENT_DATA_ROOT, { recursive: true });
  await fs.writeFile(CLIENT_PLAYLISTS_PATH, JSON.stringify(playlists, null, 2), 'utf8');
}

async function listPlaylists() {
  return {
    playlists: await readPlaylistStore(),
    path: CLIENT_PLAYLISTS_PATH
  };
}

async function savePlaylist(payload = {}) {
  const name = String(payload.name || '').trim();
  const tracks = Array.isArray(payload.tracks) ? payload.tracks.filter((track) => track && typeof track === 'object') : [];
  if (!name) {
    throw new Error('Playlists need a name.');
  }
  if (!tracks.length) {
    throw new Error('Playlists need at least one track.');
  }

  const playlists = await readPlaylistStore();
  const nextEntry = {
    name,
    createdAt: new Date().toISOString(),
    trackCount: tracks.length,
    tracks: tracks.map((track) => ({
      id: String(track.id || '').trim(),
      title: String(track.title || '').trim(),
      artist: String(track.artist || '').trim(),
      album: String(track.album || '').trim(),
      path: String(track.path || '').trim(),
      fileUrl: String(track.fileUrl || '').trim()
    }))
  };
  const filtered = playlists.filter((entry) => String(entry.name || '').trim().toLowerCase() !== name.toLowerCase());
  filtered.unshift(nextEntry);
  await writePlaylistStore(filtered.slice(0, 40));
  return { message: `Playlist "${name}" saved.`, playlist: nextEntry, path: CLIENT_PLAYLISTS_PATH };
}

async function loadPlaylist(name = '') {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) {
    throw new Error('Tell me which playlist to load.');
  }
  const playlists = await readPlaylistStore();
  const playlist = playlists.find((entry) => String(entry.name || '').trim().toLowerCase() === wanted);
  if (!playlist) {
    return { found: false, message: `I could not find a playlist named "${name}".` };
  }
  return { found: true, playlist };
}

async function listSavedScreenshots(limit = 20) {
  await fs.mkdir(CLIENT_SCREENSHOT_DIR, { recursive: true });
  const entries = await fs.readdir(CLIENT_SCREENSHOT_DIR, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const fullPath = path.join(CLIENT_SCREENSHOT_DIR, entry.name);
    const stat = await fs.stat(fullPath).catch(() => null);
    files.push({
      name: entry.name,
      path: fullPath,
      modifiedAt: stat?.mtime?.toISOString?.() || '',
      bytes: stat?.size || 0
    });
  }
  files.sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
  return {
    folder: CLIENT_SCREENSHOT_DIR,
    screenshots: files.slice(0, Math.max(1, limit))
  };
}

async function openYouTubePlayback(payload = {}) {
  const rawQuery = String(payload.query || payload.target || '').trim();
  const rawUrl = String(payload.url || '').trim();
  const preferredService = String(payload.service || '').trim().toLowerCase();
  const service = preferredService === 'youtube' ? 'youtube' : 'youtube-music';

  let url = '';
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (!/youtube\.com|youtu\.be|music\.youtube\.com/i.test(parsed.hostname)) {
        throw new Error('That link is not a YouTube URL.');
      }
      url = parsed.toString();
    } catch (error) {
      throw new Error(error.message || 'That YouTube link was not valid.');
    }
  } else if (rawQuery) {
    url = service === 'youtube'
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(rawQuery)}`
      : `https://music.youtube.com/search?q=${encodeURIComponent(rawQuery)}`;
  } else {
    url = service === 'youtube'
      ? 'https://www.youtube.com/'
      : 'https://music.youtube.com/';
  }

  await shell.openExternal(url);
  return {
    message: rawQuery
      ? `Opened ${service === 'youtube' ? 'YouTube' : 'YouTube Music'} for "${rawQuery}".`
      : `Opened ${service === 'youtube' ? 'YouTube' : 'YouTube Music'}.`,
    url,
    query: rawQuery,
    service
  };
}

async function runLocalTool(action, payload = {}) {
  switch (action) {
    case 'note:add':
      await appendJsonLine(CLIENT_NOTES_PATH, { text: String(payload.text || '').trim() });
      return { message: 'Note saved.', path: CLIENT_NOTES_PATH };
    case 'note:list':
      return { notes: await readJsonLines(CLIENT_NOTES_PATH, 10), path: CLIENT_NOTES_PATH };
    case 'reminder:add':
      await appendJsonLine(CLIENT_REMINDERS_PATH, {
        text: String(payload.text || '').trim(),
        when: String(payload.when || '').trim()
      });
      return { message: 'Reminder saved.', path: CLIENT_REMINDERS_PATH };
    case 'reminder:list':
      return { reminders: await readJsonLines(CLIENT_REMINDERS_PATH, 10), path: CLIENT_REMINDERS_PATH };
    case 'calendar:add':
      return createCalendarReminder(payload);
    case 'clipboard:save': {
      const text = clipboard.readText();
      await appendJsonLine(CLIENT_CLIPBOARD_PATH, { text });
      return { message: text ? 'Clipboard text saved.' : 'Clipboard was empty, but the empty entry was recorded.', path: CLIENT_CLIPBOARD_PATH };
    }
    case 'clipboard:list':
      return { clips: await readJsonLines(CLIENT_CLIPBOARD_PATH, 10), path: CLIENT_CLIPBOARD_PATH };
    case 'screenshot:save':
      return saveCurrentScreenshot();
    case 'screenshot:list':
      return listSavedScreenshots(payload.limit || 20);
    case 'file:search':
      return collectFileMatches(payload.root || app.getPath('home'), payload.query, payload);
    case 'folder:cleanup-plan':
      return buildCleanupPlan(payload.root || app.getPath('downloads'));
    case 'document:read':
      return readLocalDocument(payload.path);
    case 'voice:dictate':
      return recognizeSpeechOnce(payload.seconds, payload.lang);
    case 'shortcut:list':
    case 'macro:list':
      return listMacros();
    case 'macro:add':
      return saveMacro(payload);
    case 'macro:run':
      return runMacro(payload.name || payload.target);
    case 'playlist:list':
      return listPlaylists();
    case 'playlist:save':
      return savePlaylist(payload);
    case 'playlist:load':
      return loadPlaylist(payload.name);
    case 'diagnose':
      return {
        appName: clientProfile.appName,
        client: clientProfile.client,
        node: process.version,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        defaultBaseUrl: DEFAULT_BASE_URL,
        dataRoot: CLIENT_DATA_ROOT,
        modelFolder: path.join(__dirname, clientProfile.localModelFolder || 'models'),
        portableLmStudioFolder: path.join(__dirname, clientProfile.portableLmStudioFolder || 'lmstudio'),
        avatarFile: path.join(__dirname, clientProfile.preferredAvatarFile || ''),
        lmStudioDownloadUrl: 'https://lmstudio.ai/download/latest/win32/x64',
        models: await listBundledModelFiles()
      };
    case 'app:launch': {
      return launchResolvedTarget(payload.target, payload.target);
    }
    case 'web:search': {
      const query = String(payload.query || '').trim();
      if (!query) {
        throw new Error('Tell me what to search for.');
      }
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await shell.openExternal(url);
      return { message: `Opened web search for "${query}".`, url };
    }
    case 'youtube:play':
      return openYouTubePlayback(payload);
    default:
      throw new Error(`Unknown local tool action: ${action}`);
  }
}

function buildHeaders(apiKey) {
  const headers = {};

  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  return headers;
}

function isLmStudioUnavailableError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('unable to reach') ||
    message.includes('fetch failed') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  );
}

function trimText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeSpeechText(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\bMai Studio\b/gi, 'my studio')
    .replace(/\bMoltbook\b/gi, 'social feed')
    .replace(/[`*_#]/g, '')
    .trim();
}

async function getLocalVoiceStatus() {
  const available = await pathExists(PIPER_EXE) && await pathExists(PIPER_DEFAULT_MODEL);
  return {
    available,
    engine: available ? 'piper' : 'none',
    label: available ? PIPER_DEFAULT_VOICE_LABEL : 'No local voice engine found',
    modelPath: available ? PIPER_DEFAULT_MODEL : ''
  };
}

async function synthesizePiperSpeech(text = '') {
  const normalizedText = sanitizeSpeechText(text);
  if (!normalizedText) {
    throw new Error('No speech text was provided.');
  }

  const status = await getLocalVoiceStatus();
  if (!status.available) {
    throw new Error(`${clientProfile.assistantName || 'Mai'} local voice is not installed yet.`);
  }

  const cacheRoot = path.join(app.getPath('userData'), 'voice-cache');
  const cacheKey = createHash('sha1')
    .update(`piper:${PIPER_DEFAULT_MODEL}:${normalizedText}`)
    .digest('hex');
  const outputPath = path.join(cacheRoot, `${cacheKey}.wav`);

  if (await pathExists(outputPath)) {
    return {
      engine: 'piper',
      label: status.label,
      audioPath: outputPath,
      audioUrl: pathToFileURL(outputPath).href,
      cached: true
    };
  }

  await fs.mkdir(cacheRoot, { recursive: true });

  await new Promise((resolve, reject) => {
    const child = spawn(
      PIPER_EXE,
      ['--model', PIPER_DEFAULT_MODEL, '--output_file', outputPath],
      {
        cwd: PIPER_RUNTIME_DIR,
        windowsHide: true,
        env: {
          ...process.env,
          ESPEAK_DATA_PATH: path.join(PIPER_RUNTIME_DIR, 'espeak-ng-data')
        }
      }
    );

    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', async (code) => {
      if (code === 0 && await pathExists(outputPath)) {
        resolve();
        return;
      }

      try {
        await fs.unlink(outputPath);
      } catch {}

      reject(new Error(trimText(stderr, 240) || `Piper exited with code ${code}.`));
    });

    child.stdin.write(`${normalizedText}\n`, 'utf8');
    child.stdin.end();
  });

  return {
    engine: 'piper',
    label: status.label,
    audioPath: outputPath,
    audioUrl: pathToFileURL(outputPath).href,
    cached: false
  };
}

function extractTextContent(content) {
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        return part?.text || '';
      })
      .join('');
  }

  return String(content ?? '');
}

function inferMediaExtension(contentType = '', rawUrl = '') {
  const normalizedType = String(contentType || '').toLowerCase();
  if (normalizedType.includes('image/gif')) {
    return '.gif';
  }

  if (normalizedType.includes('image/png')) {
    return '.png';
  }

  if (normalizedType.includes('image/jpeg')) {
    return '.jpg';
  }

  if (normalizedType.includes('image/webp')) {
    return '.webp';
  }

  if (normalizedType.includes('video/mp4')) {
    return '.mp4';
  }

  try {
    const pathname = new URL(String(rawUrl || '')).pathname || '';
    const extension = path.extname(pathname).toLowerCase();
    if (/^\.[a-z0-9]{2,5}$/i.test(extension)) {
      return extension;
    }
  } catch {}

  return '.img';
}

function isRendererSafeMediaUrl(rawUrl = '') {
  return /^(?:data:|blob:|file:)/i.test(String(rawUrl || '').trim());
}

const CHAT_COMPLETION_PRIORITIES = {
  'interactive-chat': 0,
  'manual-vision': 1,
  'manual-dj': 2,
  'social-manual': 3,
  'background-vision': 5,
  'auto-dj': 6,
  presence: 7,
  'social-auto': 8,
  'session-compress': 9
};

const chatCompletionScheduler = {
  active: null,
  queue: [],
  sequence: 0,
  pumping: false
};

function createRequestAbortError(message, code = 'REQUEST_ABORTED') {
  const error = new Error(message);
  error.name = 'AbortError';
  error.code = code;
  return error;
}

function getChatCompletionPriority(options = {}) {
  if (Number.isFinite(Number(options.priority))) {
    return Number(options.priority);
  }

  const requestKind = String(options.requestKind || '').trim().toLowerCase();
  if (requestKind && Object.prototype.hasOwnProperty.call(CHAT_COMPLETION_PRIORITIES, requestKind)) {
    return CHAT_COMPLETION_PRIORITIES[requestKind];
  }

  return 4;
}

function sortChatCompletionQueue() {
  chatCompletionScheduler.queue.sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.sequence - right.sequence;
  });
}

function rejectChatCompletionRequest(request, error) {
  try {
    request.reject(error);
  } catch {}
}

function dedupeQueuedChatRequests(nextRequest) {
  if (!nextRequest.queueKey) {
    return;
  }

  const keep = [];
  for (const queuedRequest of chatCompletionScheduler.queue) {
    if (queuedRequest.queueKey === nextRequest.queueKey) {
      rejectChatCompletionRequest(
        queuedRequest,
        createRequestAbortError(
          'Mai skipped an older background action because a fresher one took its place.',
          'REQUEST_SUPERSEDED'
        )
      );
      continue;
    }

    keep.push(queuedRequest);
  }

  chatCompletionScheduler.queue = keep;
}

function maybePreemptActiveChatRequest(nextRequest) {
  const activeRequest = chatCompletionScheduler.active;
  if (!activeRequest || !activeRequest.preemptible) {
    return;
  }

  if (nextRequest.priority >= activeRequest.priority) {
    return;
  }

  if (activeRequest.controller.signal.aborted) {
    return;
  }

  activeRequest.controller.abort(
    createRequestAbortError(
      'Mai paused a background action to answer a higher-priority request first.',
      'REQUEST_PREEMPTED'
    )
  );
}

async function fetchJson(url, options = {}) {
  const { timeoutMs: timeoutRaw, signal: externalSignal, ...fetchOptions } = options || {};
  const timeoutMs = Number.isFinite(Number(timeoutRaw)) ? Number(timeoutRaw) : 12000;
  let circuitKey = DEFAULT_BASE_URL;
  try {
    const parsed = new URL(String(url || DEFAULT_BASE_URL));
    circuitKey = `${parsed.origin}${parsed.pathname.split('/v1/')[0] || ''}/v1`;
  } catch {
    circuitKey = normalizeBaseUrl(DEFAULT_BASE_URL);
  }
  const now = Date.now();
  const circuit = fetchJson._circuit || (fetchJson._circuit = new Map());
  const state = circuit.get(circuitKey) || { failures: 0, openUntil: 0, lastFailureAt: 0 };

  if (state.openUntil && now < state.openUntil) {
    throw new Error(`${clientProfile.studioName || 'LM Studio'} is temporarily unavailable. Retrying shortly.`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1200, timeoutMs));
  const handleExternalAbort = () => {
    controller.abort(externalSignal.reason || createRequestAbortError(`${clientProfile.studioName || 'LM Studio'} request canceled.`));
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      handleExternalAbort();
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  let response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timer);
    const nextFailures = (state.failures || 0) + 1;
    const cooldownMs = nextFailures >= 3 ? Math.min(45000, 6000 * nextFailures) : 0;
    circuit.set(circuitKey, {
      failures: nextFailures,
      lastFailureAt: now,
      openUntil: cooldownMs ? now + cooldownMs : 0
    });
    if (error?.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw externalSignal.reason instanceof Error
          ? externalSignal.reason
          : createRequestAbortError(String(externalSignal?.reason || `${clientProfile.studioName || 'LM Studio'} request canceled.`));
      }
      throw new Error(`${clientProfile.studioName || 'LM Studio'} request timed out. Retrying shortly.`);
    }
    throw new Error(
      `Unable to reach ${clientProfile.studioName || 'LM Studio'} at ${url}. Make sure the local server is enabled and listening.`
    );
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', handleExternalAbort);
    }
  }

  clearTimeout(timer);
  const text = await response.text();

  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      text ||
      `Request failed with status ${response.status}.`;

    const nextFailures = (state.failures || 0) + (response.status >= 500 ? 1 : 0);
    const cooldownMs = nextFailures >= 3 ? Math.min(45000, 6000 * nextFailures) : 0;
    circuit.set(circuitKey, {
      failures: nextFailures,
      lastFailureAt: now,
      openUntil: cooldownMs ? now + cooldownMs : 0
    });
    throw new Error(message);
  }

  if (state.failures || state.openUntil) {
    circuit.set(circuitKey, { failures: 0, openUntil: 0, lastFailureAt: 0 });
  }
  return payload;
}

async function cacheRemoteMediaForRenderer(rawUrl = '') {
  const sourceUrl = String(rawUrl || '').trim();
  if (!sourceUrl) {
    return '';
  }

  if (isRendererSafeMediaUrl(sourceUrl)) {
    return sourceUrl;
  }

  const cacheRoot = path.join(app.getPath('userData'), 'media-cache');
  const hash = createHash('sha1').update(sourceUrl).digest('hex');
  const guessedExt = inferMediaExtension('', sourceUrl);
  let cachedPath = path.join(cacheRoot, `${hash}${guessedExt}`);

  try {
    await fs.access(cachedPath);
    return pathToFileURL(cachedPath).href;
  } catch {}

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Media fetch failed with status ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') || '';
    const actualExt = inferMediaExtension(contentType, sourceUrl);
    cachedPath = path.join(cacheRoot, `${hash}${actualExt}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.mkdir(cacheRoot, { recursive: true });
    await fs.writeFile(cachedPath, buffer);
    return pathToFileURL(cachedPath).href;
  } finally {
    clearTimeout(timer);
  }
}

async function localizeContextMedia(result = null) {
  if (!result?.media) {
    return result;
  }

  const sourceUrl = result.media.previewUrl || result.media.url || '';
  let displayUrl = '';
  try {
    displayUrl = await cacheRemoteMediaForRenderer(sourceUrl);
  } catch {
    displayUrl = isRendererSafeMediaUrl(sourceUrl) ? sourceUrl : '';
  }

  if (!displayUrl) {
    return null;
  }

  return {
    ...result,
    media: {
      ...result.media,
      displayUrl
    }
  };
}

async function resolveModel(config, options = {}) {
  if (config?.model && config.model.trim()) {
    return config.model.trim();
  }

  const firstModel = (await listModelProfiles(config, options))[0]?.id;

  if (!firstModel) {
    throw new Error(
      `${clientProfile.studioName || 'LM Studio'} did not report any loaded models. Start the server and load a model first.`
    );
  }

  return firstModel;
}

async function listModelProfiles(config = {}, options = {}) {
  const { payload } = await fetchModelCatalog(config, options);
  return buildModelProfiles(payload?.data ?? []);
}

async function runChatCompletion(config = {}, messages = [], options = {}) {
  const model = await resolveModel(config, options);
  const { baseUrl } = await fetchModelCatalog(config, options);
  const profile = inferModelProfile(model);
  const adaptedMessages = adaptMessagesForModel(profile, messages, {
    historyWindow: options.historyWindow
  });
  const temperature = Number.parseFloat(config.temperature);

  const payload = await fetchJson(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(config.apiKey)
    },
    body: JSON.stringify({
      model,
      messages: adaptedMessages,
      temperature: Number.isFinite(temperature) ? temperature : 0.8
    }),
    timeoutMs: MAI_STUDIO_CHAT_COMPLETION_TIMEOUT_MS,
    signal: options.signal
  });

  return {
    model,
    profile,
    adapterSummary: summarizeModelProfile(profile),
    text: extractTextContent(payload?.choices?.[0]?.message?.content),
    payload
  };
}

async function pumpChatCompletionQueue() {
  if (chatCompletionScheduler.pumping) {
    return;
  }

  chatCompletionScheduler.pumping = true;
  try {
    while (!chatCompletionScheduler.active && chatCompletionScheduler.queue.length) {
      sortChatCompletionQueue();
      const request = chatCompletionScheduler.queue.shift();
      chatCompletionScheduler.active = request;

      try {
        const result = await runChatCompletion(request.config, request.messages, {
          ...request.options,
          signal: request.controller.signal
        });
        request.resolve(result);
      } catch (error) {
        rejectChatCompletionRequest(request, error);
      } finally {
        if (chatCompletionScheduler.active?.id === request.id) {
          chatCompletionScheduler.active = null;
        }
      }
    }
  } finally {
    chatCompletionScheduler.pumping = false;
    if (!chatCompletionScheduler.active && chatCompletionScheduler.queue.length) {
      queueMicrotask(() => {
        pumpChatCompletionQueue().catch(() => {});
      });
    }
  }
}

async function fetchChatCompletion(config = {}, messages = [], options = {}) {
  const priority = getChatCompletionPriority(options);
  const request = {
    id: ++chatCompletionScheduler.sequence,
    sequence: chatCompletionScheduler.sequence,
    config,
    messages,
    options,
    priority,
    queueKey: String(options.queueKey || '').trim(),
    preemptible: options.preemptible !== false && priority > CHAT_COMPLETION_PRIORITIES['social-manual'],
    controller: new AbortController()
  };

  dedupeQueuedChatRequests(request);

  const pending = new Promise((resolve, reject) => {
    request.resolve = resolve;
    request.reject = reject;
  });

  chatCompletionScheduler.queue.push(request);
  sortChatCompletionQueue();
  maybePreemptActiveChatRequest(request);
  pumpChatCompletionQueue().catch((error) => {
    rejectChatCompletionRequest(request, error);
  });
  return pending;
}

function getNormalWindowBounds() {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const width = Math.min(1280, Math.max(1060, Math.round(workArea.width * 0.72)));
  const height = Math.min(860, Math.max(700, Math.round(workArea.height * 0.78)));

  return {
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2)
  };
}

function createWindow() {
  const normalBounds = getNormalWindowBounds();

  mainWindow = new BrowserWindow({
    ...normalBounds,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    title: clientProfile.appName || 'Mai Desktop Companion',
    movable: true,
    minimizable: true,
    closable: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setBackgroundColor('#00000000');
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  });
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  sidecarHub.setEventHandler((event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sidecar:event', event);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system:sense', {
        type: 'bootstrap',
        state: systemSenseState
      });
      const smokeScreenshotPath = String(process.env.MAI_SMOKE_SCREENSHOT || '').trim();
      if (smokeScreenshotPath) {
        setTimeout(async () => {
          try {
            if (!mainWindow || mainWindow.isDestroyed()) {
              return;
            }
            const outputPath = path.resolve(smokeScreenshotPath);
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            const image = await mainWindow.webContents.capturePage();
            await fs.writeFile(outputPath, image.toPNG());
          } catch (error) {
            console.error('Smoke screenshot failed:', error);
          } finally {
            app.quit();
          }
        }, 9000);
      }
    }

    sidecarHub.maybeAutostartAll();
  });
}

function getGameCamBounds() {
  const targetDisplay = mainWindow && !mainWindow.isDestroyed()
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const workArea = targetDisplay.workArea;
  const width = Math.min(460, Math.max(360, Math.round(workArea.width * 0.22)));
  const height = Math.min(680, Math.max(480, Math.round(workArea.height * 0.48)));

  return {
    x: Math.round(workArea.x + workArea.width - width - 24),
    y: Math.round(workArea.y + 24),
    width,
    height
  };
}

function getPresenceBounds() {
  const targetDisplay = mainWindow && !mainWindow.isDestroyed()
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const workArea = targetDisplay.workArea;
  const width = Math.min(430, Math.max(340, Math.round(workArea.width * 0.2)));
  const height = Math.min(760, Math.max(560, Math.round(workArea.height * 0.66)));

  return {
    x: Math.round(workArea.x + workArea.width - width - 42),
    y: Math.round(workArea.y + workArea.height - height - 24),
    width,
    height
  };
}

function restoreNormalWindow() {
  windowModeState.gameCam = false;
  windowModeState.presence = false;
  mainWindow.setBackgroundColor('#00000000');
  mainWindow.setMinimumSize(960, 640);
  mainWindow.setResizable(true);
  mainWindow.setSkipTaskbar(false);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  });
  const restoreBounds = windowModeState.normalBounds || getNormalWindowBounds();
  mainWindow.setBounds({
    x: restoreBounds.x,
    y: restoreBounds.y,
    width: restoreBounds.width || 1180,
    height: restoreBounds.height || 820
  }, true);
  return { enabled: false, bounds: restoreBounds };
}

function setGameCamMode(enabled) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { enabled: false };
  }

  const nextEnabled = Boolean(enabled);
  if (nextEnabled === windowModeState.gameCam) {
    return { enabled: windowModeState.gameCam };
  }

  if (nextEnabled) {
    if (!windowModeState.gameCam && !windowModeState.presence) {
      windowModeState.normalBounds = mainWindow.getBounds();
    }
    windowModeState.presence = false;
    mainWindow.setBackgroundColor('#00000000');
    const gameBounds = getGameCamBounds();
    windowModeState.gameCam = true;
    mainWindow.setMinimumSize(320, 420);
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    });
    mainWindow.setSkipTaskbar(true);
    mainWindow.setBounds(gameBounds, true);
    return { enabled: true, bounds: gameBounds };
  }

  return restoreNormalWindow();
}

function setPresenceMode(enabled) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { enabled: false };
  }

  const nextEnabled = Boolean(enabled);
  if (nextEnabled === windowModeState.presence) {
    return { enabled: windowModeState.presence };
  }

  if (nextEnabled) {
    if (!windowModeState.gameCam && !windowModeState.presence) {
      windowModeState.normalBounds = mainWindow.getBounds();
    }
    windowModeState.gameCam = false;
    windowModeState.presence = true;
    mainWindow.setBackgroundColor('#00000000');
    const presenceBounds = getPresenceBounds();
    mainWindow.setMinimumSize(280, 420);
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    });
    mainWindow.setSkipTaskbar(false);
    mainWindow.setBounds(presenceBounds, true);
    return { enabled: true, bounds: presenceBounds };
  }

  return restoreNormalWindow();
}

function tokenizeTrack(text) {
  return Array.from(
    new Set(
      String(text || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length > 1)
    )
  );
}

function createTrackRecord(filePath, libraryRoot = '') {
  const extension = path.extname(filePath).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(extension)) {
    return null;
  }

  const baseName = path.basename(filePath, extension);
  const parts = baseName.split(' - ').map((part) => part.trim()).filter(Boolean);
  const folderName = path.basename(path.dirname(filePath));

  let artist = 'Unknown artist';
  let title = baseName;

  if (parts.length >= 2) {
    artist = parts[0];
    title = parts.slice(1).join(' - ');
  }

  const relativeDir = libraryRoot
    ? path.relative(libraryRoot, path.dirname(filePath))
    : path.dirname(filePath);
  const folderSegments = relativeDir
    .split(path.sep)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const searchBlob = [baseName, folderName, artist, title, folderSegments.join(' ')].join(' ').toLowerCase();

  return {
    id: filePath.toLowerCase(),
    path: filePath,
    fileUrl: pathToFileURL(filePath).href,
    title,
    artist,
    album: folderName,
    folderSegments,
    extension,
    searchBlob,
    keywords: tokenizeTrack(searchBlob).slice(0, 24)
  };
}

async function collectTracks(rootFolder, accumulator = [], libraryRoot = rootFolder) {
  let entries = [];

  try {
    entries = await fs.readdir(rootFolder, { withFileTypes: true });
  } catch {
    return accumulator;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(rootFolder, entry.name);

    if (entry.isDirectory()) {
      await collectTracks(fullPath, accumulator, libraryRoot);
      continue;
    }

    const track = createTrackRecord(fullPath, libraryRoot);
    if (track) {
      accumulator.push(track);
    }
  }

  return accumulator;
}

function execPowerShellJson(script) {
  return new Promise((resolve) => {
    execFile(
      POWERSHELL_EXE,
      ['-NoProfile', '-Command', script],
      {
        windowsHide: true,
        maxBuffer: 1024 * 1024
      },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve(null);
        }
      }
    );
  });
}

function normalizeStringList(payload) {
  if (Array.isArray(payload)) {
    return payload.map((value) => String(value || '').trim()).filter(Boolean);
  }

  if (typeof payload === 'string' && payload.trim()) {
    return [payload.trim()];
  }

  return [];
}

function arraysEqual(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

async function getForegroundWindowInfo() {
  if (process.platform !== 'win32') {
    return {
      title: '',
      processName: ''
    };
  }

  return (
    (await execPowerShellJson(FOREGROUND_WINDOW_SCRIPT)) || {
      title: '',
      processName: ''
    }
  );
}

async function getAudioEndpointStatus() {
  if (process.platform !== 'win32') {
    return {
      audioEndpoints: [],
      headphonesConnected: false
    };
  }

  const payload = await execPowerShellJson(AUDIO_ENDPOINT_SCRIPT);
  const audioEndpoints = normalizeStringList(payload).slice(0, 8);
  return {
    audioEndpoints,
    headphonesConnected: audioEndpoints.some((name) => /\b(headset|headphone|earbud|earphone|airpods|buds)\b/i.test(name))
  };
}

function broadcastSystemSense(type, patch = {}, force = false) {
  const nextState = {
    ...systemSenseState,
    ...patch,
    lastEventType: type,
    updatedAt: new Date().toISOString()
  };

  const changed =
    force ||
    nextState.activeWindowTitle !== systemSenseState.activeWindowTitle ||
    nextState.activeProcessName !== systemSenseState.activeProcessName ||
    nextState.idleState !== systemSenseState.idleState ||
    nextState.idleSeconds !== systemSenseState.idleSeconds ||
    nextState.locked !== systemSenseState.locked ||
    nextState.headphonesConnected !== systemSenseState.headphonesConnected ||
    !arraysEqual(nextState.audioEndpoints || [], systemSenseState.audioEndpoints || []);

  systemSenseState = nextState;

  if (changed && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system:sense', {
      type,
      state: systemSenseState
    });
  }
}

async function pollSystemSense() {
  const previous = { ...systemSenseState };
  const foreground = await getForegroundWindowInfo();
  const idleSeconds = typeof powerMonitor.getSystemIdleTime === 'function'
    ? powerMonitor.getSystemIdleTime()
    : 0;
  const idleState = idleSeconds >= 540 ? 'away' : idleSeconds >= 90 ? 'idle' : 'active';
  const audioStatus = await getAudioEndpointStatus().catch(() => ({
    audioEndpoints: previous.audioEndpoints || [],
    headphonesConnected: Boolean(previous.headphonesConnected)
  }));

  let eventType = 'system-pulse';
  if (
    foreground.title !== previous.activeWindowTitle ||
    foreground.processName !== previous.activeProcessName
  ) {
    eventType = 'window-change';
  } else if (idleState !== previous.idleState) {
    eventType = idleState === 'active' ? 'user-returned' : 'user-idle';
  } else if (
    audioStatus.headphonesConnected !== previous.headphonesConnected ||
    !arraysEqual(audioStatus.audioEndpoints || [], previous.audioEndpoints || [])
  ) {
    eventType = 'audio-route-change';
  }

  broadcastSystemSense(eventType, {
    activeWindowTitle: foreground.title || '',
    activeProcessName: foreground.processName || '',
    idleSeconds,
    idleState,
    ...audioStatus
  });
}

function startSystemSense() {
  if (systemSenseTimer) {
    return;
  }

  pollSystemSense().catch(() => {});
  systemSenseTimer = setInterval(() => {
    pollSystemSense().catch(() => {});
  }, 15000);

  powerMonitor.on('lock-screen', () => {
    broadcastSystemSense('lock-screen', { locked: true }, true);
  });
  powerMonitor.on('unlock-screen', () => {
    broadcastSystemSense('unlock-screen', { locked: false, idleState: 'active', idleSeconds: 0 }, true);
    pollSystemSense().catch(() => {});
  });
  powerMonitor.on('suspend', () => {
    broadcastSystemSense('system-suspend', {}, true);
  });
  powerMonitor.on('resume', () => {
    broadcastSystemSense('system-resume', {}, true);
    pollSystemSense().catch(() => {});
  });
}

function chooseScreenSource(sources) {
  const cursorPoint = screen.getCursorScreenPoint();
  const targetDisplay = screen.getDisplayNearestPoint(cursorPoint);

  return (
    sources.find((source) => source.display_id === String(targetDisplay.id)) ||
    sources[0] ||
    null
  );
}

async function captureScreenContext(options = {}) {
  const activeWindow = await getForegroundWindowInfo();
  const hideCompanion = options.hideCompanion !== false;

  let previousOpacity = 1;

  if (hideCompanion && mainWindow && !mainWindow.isDestroyed()) {
    previousOpacity = mainWindow.getOpacity();
    mainWindow.setIgnoreMouseEvents(true);
    mainWindow.setOpacity(0);
    await sleep(140);
  }

  try {
    const cursorPoint = screen.getCursorScreenPoint();
    const targetDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const maxWidth = Number.isFinite(options.maxWidth) ? options.maxWidth : 1280;
    const maxHeight = Number.isFinite(options.maxHeight) ? options.maxHeight : 720;
    const scale = Math.min(
      1,
      maxWidth / targetDisplay.size.width,
      maxHeight / targetDisplay.size.height
    );

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.max(640, Math.round(targetDisplay.size.width * scale)),
        height: Math.max(360, Math.round(targetDisplay.size.height * scale))
      },
      fetchWindowIcons: false
    });

    const source = chooseScreenSource(sources);

    if (!source || source.thumbnail.isEmpty()) {
      throw new Error('Unable to capture the desktop.');
    }

    return {
      imageDataUrl: source.thumbnail.toDataURL(),
      capturedAt: new Date().toISOString(),
      activeWindowTitle: activeWindow?.title || '',
      activeProcessName: activeWindow?.processName || '',
      displayLabel: targetDisplay.label || `Display ${targetDisplay.id}`
    };
  } finally {
    if (hideCompanion && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(previousOpacity);
      mainWindow.setIgnoreMouseEvents(false);
    }
  }
}

async function capturePresenceBackdrop(options = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { imageDataUrl: '' };
  }

  const targetDisplay = screen.getDisplayMatching(mainWindow.getBounds());
  const displayBounds = targetDisplay.bounds;
  const windowBounds = mainWindow.getBounds();
  const stageRect = options?.stageRect && typeof options.stageRect === 'object'
    ? options.stageRect
    : null;
  const offsetX = Math.max(0, Math.round(Number(stageRect?.left) || 0));
  const offsetY = Math.max(0, Math.round(Number(stageRect?.top) || 0));
  const stageWidth = Math.max(1, Math.round(Number(stageRect?.width) || windowBounds.width));
  const stageHeight = Math.max(1, Math.round(Number(stageRect?.height) || windowBounds.height));
  const captureRect = {
    x: Math.max(0, Math.round(windowBounds.x - displayBounds.x + offsetX)),
    y: Math.max(0, Math.round(windowBounds.y - displayBounds.y + offsetY)),
    width: Math.min(displayBounds.width, stageWidth),
    height: Math.min(displayBounds.height, stageHeight)
  };

  const previousOpacity = typeof mainWindow.getOpacity === 'function' ? mainWindow.getOpacity() : 1;
  try {
    if (typeof mainWindow.setIgnoreMouseEvents === 'function') {
      mainWindow.setIgnoreMouseEvents(true);
    }
    if (typeof mainWindow.setOpacity === 'function') {
      mainWindow.setOpacity(0);
      await sleep(140);
    }
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.max(1, displayBounds.width),
        height: Math.max(1, displayBounds.height)
      },
      fetchWindowIcons: false
    });
    const source = chooseScreenSource(sources, targetDisplay);
    if (!source || source.thumbnail.isEmpty()) {
      return { imageDataUrl: '' };
    }
    const cropped = source.thumbnail
      .crop(captureRect)
      .resize({
        width: stageWidth,
        height: stageHeight,
        quality: 'best'
      });
    return {
      imageDataUrl: cropped.toDataURL(),
      displayLabel: targetDisplay.label || `Display ${targetDisplay.id}`
    };
  } finally {
    if (!mainWindow.isDestroyed() && typeof mainWindow.setOpacity === 'function') {
      mainWindow.setOpacity(previousOpacity);
    }
    if (!mainWindow.isDestroyed() && typeof mainWindow.setIgnoreMouseEvents === 'function') {
      mainWindow.setIgnoreMouseEvents(false);
    }
  }
}

async function listBundledAvatars() {
  const entries = await fs.readdir(__dirname, { withFileTypes: true }).catch(() => []);
  const preferredAvatarFile = String(clientProfile.preferredAvatarFile || '').trim();

  const avatars = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.vrm')
    .map((entry) => path.join(__dirname, entry.name))
    .sort();

  if (!preferredAvatarFile) {
    return avatars;
  }

  const preferredIndex = avatars.findIndex((avatarPath) => path.basename(avatarPath) === preferredAvatarFile);
  if (preferredIndex <= 0) {
    return avatars;
  }

  const [preferredAvatarPath] = avatars.splice(preferredIndex, 1);
  avatars.unshift(preferredAvatarPath);
  return avatars;
}

async function listAnimationFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isFile() && ANIMATION_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const fullPath = path.join(folderPath, entry.name);
      return {
        name: entry.name,
        path: fullPath,
        fileUrl: pathToFileURL(fullPath).href
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
}

function findAnimationPaths(files, candidates) {
  const matches = [];
  const seenPaths = new Set();

  for (const candidate of candidates) {
    const match = files.find((file) => file.name.toLowerCase() === candidate.toLowerCase());
    if (match && !seenPaths.has(match.path)) {
      matches.push(match.path);
      seenPaths.add(match.path);
    }
  }

  return matches;
}

/** First matching rule wins (most specific presets checked first). */
function inferAnimationPresetFromBasename(fileName) {
  const base = path.basename(String(fileName || '')).toLowerCase();
  if (!base || !base.endsWith('.vrma')) {
    return null;
  }

  const rules = [
    ['groove', /(danc|groove|spin|stretch|sway|bob|bounce|beat|club|rave|hop|律动|旋转|屈伸|舞|跳)/],
    ['wave', /(wave|greet|hello|salut|bye|挥手|问候|致意|你好|招手|hi[_-]|waving)/],
    ['happy', /(happy|smile|joy|cheer|laugh|clap|vsign|peace|liked|耶|开心|高兴|喜)/],
    ['curious', /(curious|think|ponder|look|lean|inspect|pose|action|shoot|model|showcase|wonder|琢磨|思考|姿势|姿态|射击|展示|tilt)/],
    ['idle', /(idle|wait|stand|neutral|relax|rest|待機|等待|站立|静)/]
  ];

  for (const [preset, re] of rules) {
    if (re.test(base)) {
      return preset;
    }
  }

  return null;
}

function mergeHeuristicPresetAssignments(allFiles, presets) {
  const used = new Set(Object.values(presets).flat());

  for (const file of allFiles) {
    if (!file?.path || used.has(file.path)) {
      continue;
    }

    const inferred = inferAnimationPresetFromBasename(file.name);
    if (!inferred || !presets[inferred]) {
      continue;
    }

    presets[inferred].push(file.path);
    used.add(file.path);
  }

  return presets;
}

async function listAnimationLibraries() {
  const libraries = [];

  for (const candidate of ANIMATION_LIBRARY_CANDIDATES) {
    const files = await listAnimationFiles(candidate.folderPath);
    if (!files.length) {
      continue;
    }

    libraries.push({
      source: candidate.source,
      folderPath: candidate.folderPath,
      files
    });
  }

  const allFiles = libraries.flatMap((library) => library.files);
  const uniqueActionCount = new Set(allFiles.map((file) => file.name.toLowerCase())).size;

  const presets = {
    idle: findAnimationPaths(allFiles, [
      'idle-wait-01.vrma',
      'idle-wait-02.vrma',
      'idle-wait-03.vrma',
      'idle-wait-04.vrma',
      'idle-wait-05.vrma',
      'wait01.vrma',
      'wait02.vrma',
      'wait03.vrma',
      'wait04.vrma',
      'wait05.vrma',
      'VRMA_01.vrma'
    ]),
    wave: findAnimationPaths(allFiles, [
      'wave-greeting.vrma',
      '致意问候.vrma',
      'VRMA_02.vrma'
    ]),
    happy: findAnimationPaths(allFiles, [
      'happy-liked.vrma',
      'happy-vsign.vrma',
      'liked.vrma',
      '比 V 手势.vrma',
      'VRMA_03.vrma'
    ]),
    curious: findAnimationPaths(allFiles, [
      'curious-model-pose.vrma',
      'showcase-fullbody.vrma',
      'pose-action.vrma',
      '模特姿势.vrma',
      '全身展示.vrma',
      '射击姿态.vrma',
      'VRMA_04.vrma',
      'VRMA_06.vrma'
    ]),
    groove: findAnimationPaths(allFiles, [
      'groove-spin.vrma',
      'groove-stretch.vrma',
      '旋转.vrma',
      '屈伸运动.vrma',
      'VRMA_05.vrma',
      'VRMA_07.vrma'
    ])
  };

  mergeHeuristicPresetAssignments(allFiles, presets);

  return {
    libraries,
    actionCount: allFiles.length,
    uniqueActionCount,
    presets
  };
}

app.whenReady().then(() => {
  createWindow();
  startSystemSense();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (systemSenseTimer) {
    clearInterval(systemSenseTimer);
    systemSenseTimer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('window:minimize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.setAlwaysOnTop(false);
  mainWindow.minimize();
});

app.on('browser-window-focus', (_event, window) => {
  if (window && !window.isDestroyed() && window === mainWindow && !windowModeState.gameCam && !windowModeState.presence) {
    window.setAlwaysOnTop(true, 'screen-saver');
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:get-bounds', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }
  return mainWindow.getBounds();
});

ipcMain.handle('window:move-to', (_event, x, y) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }
  const nextX = Math.round(Number(x) || 0);
  const nextY = Math.round(Number(y) || 0);
  mainWindow.setPosition(nextX, nextY, false);
  if (!windowModeState.gameCam && !windowModeState.presence) {
    windowModeState.normalBounds = mainWindow.getBounds();
  }
  return mainWindow.getBounds();
});

ipcMain.handle('window:set-game-cam-mode', (_event, enabled) => setGameCamMode(enabled));
ipcMain.handle('window:set-presence-mode', (_event, enabled) => setPresenceMode(enabled));
ipcMain.handle('window:capture-presence-backdrop', async (_event, options = {}) => capturePresenceBackdrop(options));

ipcMain.handle('app:get-default-paths', () => ({
  downloads: app.getPath('downloads'),
  music: app.getPath('music'),
  home: app.getPath('home'),
  data: CLIENT_DATA_ROOT,
  screenshots: CLIENT_SCREENSHOT_DIR
}));
ipcMain.handle('assistant:run-local-tool', async (_event, action, payload = {}) => runLocalTool(action, payload));
ipcMain.handle('system:get-sense-status', () => systemSenseState);
ipcMain.handle('tts:get-status', async () => getLocalVoiceStatus());
ipcMain.handle('tts:speak', async (_event, payload = {}) => {
  return synthesizePiperSpeech(payload.text || '');
});

ipcMain.handle('avatar:pick-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a VRM avatar',
    properties: ['openFile'],
    filters: [
      {
        name: 'VRM Avatar',
        extensions: ['vrm']
      }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('avatar:list-bundled', async () => listBundledAvatars());
ipcMain.handle('animation:list-library', async () => listAnimationLibraries());

ipcMain.handle('screen:capture-context', async (_event, options = {}) => captureScreenContext(options));

ipcMain.handle('music:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a music folder',
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('music:scan-library', async (_event, folderPath) => {
  if (!folderPath) {
    throw new Error('Choose a music folder first.');
  }

  const allTracks = await collectTracks(folderPath);
  const limitedTracks = allTracks.slice(0, 1500);

  return {
    folderPath,
    tracks: limitedTracks,
    totalTracks: allTracks.length,
    truncated: allTracks.length > limitedTracks.length
  };
});

ipcMain.handle('lmstudio:list-models', async (_event, config = {}) => {
  try {
    const profiles = await listModelProfiles(config);
    return profiles.map((model) => model.id);
  } catch (error) {
    if (isLmStudioUnavailableError(error)) {
      return [];
    }
    throw error;
  }
});

ipcMain.handle('lmstudio:list-model-profiles', async (_event, config = {}) => {
  try {
    return await listModelProfiles(config);
  } catch (error) {
    if (isLmStudioUnavailableError(error)) {
      return [];
    }
    throw error;
  }
});

ipcMain.handle('lmstudio:chat', async (_event, config = {}, messages = [], options = {}) => {
  try {
    return await fetchChatCompletion(config, messages, {
      requestKind: 'interactive-chat',
      preemptible: false,
      ...options
    });
  } catch (error) {
    if (isLmStudioUnavailableError(error)) {
      return {
        unavailable: true,
        error: `${clientProfile.studioName || 'LM Studio'} is not running yet.`,
        model: '',
        profile: null,
        adapterSummary: '',
        text: ''
      };
    }
    throw error;
  }
});
ipcMain.handle('media:pick-contextual', async (_event, config = {}, context = {}) => {
  const result = await contextMediaPicker.pick(config, context);
  return localizeContextMedia(result);
});

ipcMain.handle('memory:get-status', async () => memoryEngine.getStatus());
ipcMain.handle('memory:get-reflections', async () => memoryEngine.getReflections());
ipcMain.handle('memory:remember', async (_event, entry = {}) => memoryEngine.remember(entry));
ipcMain.handle('memory:remember-many', async (_event, entries = []) => memoryEngine.rememberMany(entries));
ipcMain.handle('memory:recall', async (_event, query = {}) => memoryEngine.recall(query));
ipcMain.handle('memory:get-session-compress', async () => memoryEngine.getSessionCompress());
ipcMain.handle('memory:refresh-session-compress', async (_event, payload = {}) => {
  const config = payload.config || {};
  const historyAnchor = Math.max(0, Math.round(Number(payload.historyAnchor) || 0));
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const fullHistoryLength = Math.max(0, Math.round(Number(payload.fullHistoryLength) || 0));
  const prev = memoryEngine.getSessionCompress();

  if (messages.length < 10) {
    return prev;
  }

  const transcript = messages
    .map((m) => `${m.role}: ${String(m.content || '').slice(0, 1800)}`)
    .join('\n')
    .slice(0, 12000);
  const priorText = String(prev.text || '').slice(0, 4000);
  const system =
    'You compress an ongoing companion chat for continuity. Merge the new dialogue into the prior note. Maximum about 900 characters. Continuous prose. Preserve names, decisions, emotional tone, running jokes, and open threads so the companion stays coherent and lifelike across turns. Drop filler. Output only the compressed note. No title line.';
  const user = `Prior note:\n${priorText || '(none)'}\n\nNew dialogue:\n${transcript}`;

  try {
    const compressConfig = { ...config, temperature: '0.35' };
    const result = await fetchChatCompletion(
      compressConfig,
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      {
        historyWindow: 2,
        requestKind: 'session-compress',
        queueKey: 'session-compress',
        preemptible: true
      }
    );
    const text = String(result.text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4500);
    if (!text) {
      return prev;
    }
    const nextAnchor = fullHistoryLength || historyAnchor + messages.length;
    return memoryEngine.setSessionCompress({ text, historyAnchor: nextAnchor });
  } catch {
    return prev;
  }
});

ipcMain.handle('sidecars:list-status', async () => sidecarHub.getStatuses());
ipcMain.handle('sidecars:get-status', async (_event, sidecarId) => sidecarHub.getStatus(sidecarId));
ipcMain.handle('sidecars:get-context', async (_event, sidecarId) => sidecarHub.getContextForMain(sidecarId));
ipcMain.handle('sidecars:set-enabled', async (_event, sidecarId, enabled) => sidecarHub.setEnabled(sidecarId, Boolean(enabled)));
ipcMain.handle('sidecars:update-context', async (_event, patch = {}, origin = 'mai-companion') => sidecarHub.updateContext(patch, origin));
ipcMain.handle('sidecars:run-now', async (_event, sidecarId, trigger = 'manual') => sidecarHub.runNow(sidecarId, trigger));
