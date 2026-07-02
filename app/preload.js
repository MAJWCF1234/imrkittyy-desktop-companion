const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopCompanion', {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  getWindowBounds: () => ipcRenderer.invoke('window:get-bounds'),
  moveWindowTo: (x, y) => ipcRenderer.invoke('window:move-to', x, y),
  setGameCamMode: (enabled) => ipcRenderer.invoke('window:set-game-cam-mode', enabled),
  setPresenceMode: (enabled) => ipcRenderer.invoke('window:set-presence-mode', enabled),
  capturePresenceBackdrop: (payload) => ipcRenderer.invoke('window:capture-presence-backdrop', payload),
  getDefaultPaths: () => ipcRenderer.invoke('app:get-default-paths'),
  runLocalTool: (action, payload) => ipcRenderer.invoke('assistant:run-local-tool', action, payload),
  getSystemSenseStatus: () => ipcRenderer.invoke('system:get-sense-status'),
  getTtsStatus: () => ipcRenderer.invoke('tts:get-status'),
  speakTts: (payload) => ipcRenderer.invoke('tts:speak', payload),
  pickAvatarFile: () => ipcRenderer.invoke('avatar:pick-file'),
  listBundledAvatars: () => ipcRenderer.invoke('avatar:list-bundled'),
  listAnimationLibrary: () => ipcRenderer.invoke('animation:list-library'),
  captureScreenContext: (options) => ipcRenderer.invoke('screen:capture-context', options),
  pickMusicFolder: () => ipcRenderer.invoke('music:pick-folder'),
  scanMusicLibrary: (folderPath) => ipcRenderer.invoke('music:scan-library', folderPath),
  listModels: (config) => ipcRenderer.invoke('lmstudio:list-models', config),
  listModelProfiles: (config) => ipcRenderer.invoke('lmstudio:list-model-profiles', config),
  chat: (config, messages, options) => ipcRenderer.invoke('lmstudio:chat', config, messages, options),
  pickContextMedia: (config, context) => ipcRenderer.invoke('media:pick-contextual', config, context),
  getMemoryStatus: () => ipcRenderer.invoke('memory:get-status'),
  getMemoryReflections: () => ipcRenderer.invoke('memory:get-reflections'),
  rememberMemory: (entry) => ipcRenderer.invoke('memory:remember', entry),
  rememberMemories: (entries) => ipcRenderer.invoke('memory:remember-many', entries),
  recallMemories: (query) => ipcRenderer.invoke('memory:recall', query),
  getSessionCompress: () => ipcRenderer.invoke('memory:get-session-compress'),
  refreshSessionCompress: (payload) => ipcRenderer.invoke('memory:refresh-session-compress', payload),
  listSidecarStatuses: () => ipcRenderer.invoke('sidecars:list-status'),
  getSidecarStatus: (sidecarId) => ipcRenderer.invoke('sidecars:get-status', sidecarId),
  getSidecarContext: (sidecarId) => ipcRenderer.invoke('sidecars:get-context', sidecarId),
  setSidecarEnabled: (sidecarId, enabled) => ipcRenderer.invoke('sidecars:set-enabled', sidecarId, enabled),
  updateSidecarContext: (patch, origin) => ipcRenderer.invoke('sidecars:update-context', patch, origin),
  runSidecarNow: (sidecarId, trigger) => ipcRenderer.invoke('sidecars:run-now', sidecarId, trigger),
  onSidecarEvent: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('sidecar:event', handler);
    return () => ipcRenderer.removeListener('sidecar:event', handler);
  },
  onSystemSense: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('system:sense', handler);
    return () => ipcRenderer.removeListener('system:sense', handler);
  }
});
