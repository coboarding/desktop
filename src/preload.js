const { contextBridge, ipcRenderer } = require('electron');

// Eksponuj bezpieczne API do warstwy renderującej
contextBridge.exposeInMainWorld('electronAPI', {
  // LLM
  processText: (text) => ipcRenderer.invoke('llm-process', text),
  
  // TTS
  synthesizeSpeech: (text) => ipcRenderer.invoke('tts-synthesize', text),
  
  // Animacja ASCII
  setAnimationType: (type) => ipcRenderer.invoke('set-animation-type', type),
  
  // System
  getAppInfo: () => ({
    version: process.env.npm_package_version,
    platform: process.platform
  })
});