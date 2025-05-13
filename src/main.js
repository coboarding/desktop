const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const log = require('electron-log');

// Importy lokalnych serwisów
const LLMService = require('./services/llm');
const STTService = require('./services/stt');
const TTSService = require('./services/tts');
const K3sManager = require('./infrastructure/k3s');
const NoVNCServer = require('./services/novncServer');
const AsciiGenerator = require('./services/asciifier');

// Ścieżki
const appPath = app.getAppPath();
const modelsPath = path.join(appPath, 'models');

// Importy lokalnych serwisów
const LLMService = require('./services/llm');
const STTService = require('./services/stt');
const TTSService = require('./services/tts');
const K3sManager = require('./infrastructure/k3s');

// Zmienne globalne
let mainWindow = null;
let expressApp = null;
let httpServer = null;
let io = null;
let llmService = null;
let sttService = null;
let ttsService = null;
let k3sManager = null;
let novncServer = null;
let asciiGenerator = null;

// Inicjalizacja serwisów
const initializeServices = async () => {
  try {
    log.info('Inicjalizacja serwisów...');
    
    // Inicjalizacja modelu LLM
    llmService = new LLMService({
      modelPath: path.join(modelsPath, 'llm/model.onnx')
    });
    await llmService.initialize();
    
    // Inicjalizacja STT
    sttService = new STTService({
      modelPath: path.join(modelsPath, 'stt')
    });
    await sttService.initialize();
    
    // Inicjalizacja TTS
    ttsService = new TTSService({
      modelPath: path.join(modelsPath, 'tts')
    });
    await ttsService.initialize();
    
    // Inicjalizacja K3s w tle (jeśli potrzebne)
    k3sManager = new K3sManager({
      kubeconfig: path.join(appPath, 'kubernetes/kubeconfig')
    });
    
    if (process.env.USE_K3S === 'true') {
      await k3sManager.start();
    }
    
    // Inicjalizacja generatora ASCII
    asciiGenerator = new AsciiGenerator();
    await asciiGenerator.initialize();
    
    // Inicjalizacja serwera noVNC
    novncServer = new NoVNCServer({ port: 6080 });
    await novncServer.initialize();
    
    // Inicjalizacja K3s w tle (jeśli potrzebne)
    k3sManager = new K3sManager({
      kubeconfig: path.join(appPath, 'kubernetes/kubeconfig')
    });

    if (process.env.USE_K3S === 'true') {
      await k3sManager.start();
    }

    log.info('Wszystkie serwisy zainicjalizowane!');
    return true;
  } catch (error) {
    log.error('Błąd inicjalizacji serwisów:', error);
    return false;
  }
};

// Serwer Express dla WebSocket
const setupExpressServer = () => {
  expressApp = express();
  httpServer = http.createServer(expressApp);
  io = new Server(httpServer);
  
  // Ścieżka statyczna dla zasobów
  expressApp.use(express.static(path.join(__dirname, 'renderer')));
  
  // Obsługa Socket.IO
  io.on('connection', (socket) => {
    log.info('Nowe połączenie WebSocket');
    
    // Obsługa danych audio do STT
    socket.on('audio-data', async (audioData) => {
      try {
        const text = await sttService.transcribe(audioData);
        if (text && text.trim()) {
          // Zmiana stanu animacji na "thinking"
          if (novncServer) {
            novncServer.setAnimation('thinking');
          }

          // Przetwarzanie przez LLM
          const response = await llmService.process(text);
          
          // Wysłanie odpowiedzi tekstowej
          socket.emit('transcription', { user: text, assistant: response });
          
          // Zmiana stanu animacji na "talking"
          if (novncServer) {
            novncServer.setAnimation('talking');
          }

          // Generowanie odpowiedzi głosowej
          const audioResponse = await ttsService.synthesize(response);
          socket.emit('audio-response', audioResponse);

          // Powrót do stanu "idle" po zakończeniu mówienia
          setTimeout(() => {
            if (novncServer) {
              novncServer.setAnimation('idle');
            }
          }, 1000);
        }
      } catch (error) {
        log.error('Błąd przetwarzania audio:', error);
      }
    });
    
    // Auto-start konwersacji po połączeniu
    setTimeout(async () => {
      const welcomeMessage = "Witaj w aplikacji VideoChat! Jak mogę Ci dziś pomóc?";

      // Zmiana stanu animacji na "talking"
      if (novncServer) {
        novncServer.setAnimation('talking');
      }

      socket.emit('transcription', { assistant: welcomeMessage });
      
      const welcomeAudio = await ttsService.synthesize(welcomeMessage);
      socket.emit('audio-response', welcomeAudio);

      // Powrót do stanu "idle" po zakończeniu mówienia
      setTimeout(() => {
        if (novncServer) {
          novncServer.setAnimation('idle');
        }
      }, 3000);
    }, 1000);
  });
  
  // Uruchomienie serwera na porcie 3000
  httpServer.listen(3000, () => {
    log.info('Serwer Express uruchomiony na porcie 3000');
  });
};

// Tworzenie okna aplikacji
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(appPath, 'assets/icon.png')
  });

  // Ładowanie interfejsu
  mainWindow.loadURL('http://localhost:3000');
  
  // Otwieranie DevTools w trybie deweloperskim
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // Maksymalizacja okna
  mainWindow.maximize();
};

// Inicjalizacja aplikacji
app.whenReady().then(async () => {
  log.info('Aplikacja uruchamia się...');
  
  // Inicjalizacja serwisów
  await initializeServices();
  
  // Konfiguracja serwera Express
  setupExpressServer();
  
  // Utworzenie okna po inicjalizacji
  createWindow();
});

// Obsługa IPC do komunikacji między procesami
ipcMain.handle('llm-process', async (event, text) => {
  try {
    return await llmService.process(text);
  } catch (error) {
    log.error('Błąd przetwarzania LLM:', error);
    return 'Przepraszam, wystąpił błąd przetwarzania.';
  }
});

ipcMain.handle('tts-synthesize', async (event, text) => {
  try {
    return await ttsService.synthesize(text);
  } catch (error) {
    log.error('Błąd syntezy mowy:', error);
    return null;
  }
});

// Nowy handler dla zmiany typu animacji
ipcMain.handle('set-animation-type', (event, type) => {
  if (novncServer) {
    novncServer.setAnimation(type);
    return true;
  }
  return false;
});

// Zamknięcie aplikacji
app.on('window-all-closed', async () => {
  // Zatrzymanie K3s
  if (k3sManager) await k3sManager.stop();
  
  // Zatrzymanie serwera noVNC
  if (novncServer) await novncServer.stop();
  
  // Zatrzymanie serwera HTTP
  if (httpServer) httpServer.close();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});