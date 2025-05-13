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
    
    // Sprawdź, czy włączony jest tryb automatyzacji przeglądarki
    const browserMode = process.argv.includes('--browser-mode') || process.env.BROWSER_MODE === 'true';
    
    // Inicjalizacja serwera noVNC z odpowiednim trybem UI
    novncServer = new NoVNCServer({ 
      port: 6080,
      uiMode: browserMode ? 'browser' : 'ascii',
      headlessBrowser: process.argv.includes('--headless') || process.env.HEADLESS_BROWSER === 'true',
      recordVideo: process.argv.includes('--record-video') || process.env.RECORD_VIDEO === 'true',
      defaultBrowserUrl: process.env.DEFAULT_BROWSER_URL || 'https://www.google.com'
    });
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
  
  // Dodaj specyficzną trasę dla strony głównej
  expressApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'renderer', 'index.html'));
  });
  
  // Dodaj trasę dla VNC
  expressApp.get('/vnc.html', (req, res) => {
    res.sendFile(path.join(appPath, 'vendor/novnc/vnc.html'));
  });
  
  // Dodaj endpoint do pobrania aktualnego portu noVNC
  expressApp.get('/api/novnc-port', (req, res) => {
    const novncPort = novncServer ? novncServer.port : null;
    res.json({ port: novncPort });
  });
  
  // Obsługa Socket.IO
  io.on('connection', (socket) => {
    log.info('Nowe połączenie WebSocket');
    
    // Obsługa danych audio do STT
    socket.on('audio-data', async (audioData) => {
      try {
        const result = await sttService.transcribe(audioData);
        
        // Sprawdź, czy wynik to obiekt z typem web-stt-request
        if (result && result.type === 'web-stt-request') {
          // Wyślij prośbę do przeglądarki o użycie Web Speech API
          socket.emit('web-stt-request');
          return;
        }
        
        const text = result; // Jeśli nie jest to obiekt, to jest to tekst
        
        if (text && text.trim()) {
          log.info(`Rozpoznany tekst: "${text}"`);
          
          // Zmiana stanu animacji na "listening" podczas rozpoznawania mowy
          if (novncServer) {
            novncServer.setAnimation('listening');
          }
          
          // Informuj użytkownika, że jego wypowiedź została rozpoznana
          socket.emit('transcription', { user: text });
          
          // Zmiana stanu animacji na "thinking" podczas przetwarzania
          if (novncServer) {
            novncServer.setAnimation('thinking');
          }

          // Przetwarzanie przez LLM
          const response = await llmService.process(text);
          
          // Wysłanie odpowiedzi tekstowej
          socket.emit('transcription', { assistant: response });
          
          // Zmiana stanu animacji na "talking"
          if (novncServer) {
            novncServer.setAnimation('talking');
          }

          // Generowanie odpowiedzi głosowej
          const audioResponse = await ttsService.synthesize(response);
          
          // Sprawdź, czy odpowiedź to obiekt z typem web-tts
          if (audioResponse && audioResponse.type === 'web-tts') {
            // Wyślij tekst do przeglądarki do odczytania przez Web Speech API
            socket.emit('web-tts', audioResponse);
          } else {
            // Wyślij binarną odpowiedź audio (stary sposób)
            socket.emit('audio-response', audioResponse);
          }

          // Powrót do stanu "listening" po zakończeniu mówienia
          setTimeout(() => {
            if (novncServer) {
              novncServer.setAnimation('listening');
            }
          }, 1000);
        }
      } catch (error) {
        log.error('Błąd przetwarzania audio:', error);
        socket.emit('error', { message: 'Wystąpił błąd podczas przetwarzania audio' });
      }
    });
    
    // Obsługa wyników Web Speech API z przeglądarki
    socket.on('web-stt-result', async (data) => {
      try {
        if (data && data.transcript) {
          const text = data.transcript;
          log.info(`Rozpoznany tekst z Web Speech API: "${text}"`);
          
          // Zmiana stanu animacji na "listening" podczas rozpoznawania mowy
          if (novncServer) {
            novncServer.setAnimation('listening');
          }
          
          // Informuj użytkownika, że jego wypowiedź została rozpoznana
          socket.emit('transcription', { user: text });
          
          // Zmiana stanu animacji na "thinking" podczas przetwarzania
          if (novncServer) {
            novncServer.setAnimation('thinking');
          }

          // Przetwarzanie przez LLM
          const response = await llmService.process(text);
          
          // Wysłanie odpowiedzi tekstowej
          socket.emit('transcription', { assistant: response });
          
          // Zmiana stanu animacji na "talking"
          if (novncServer) {
            novncServer.setAnimation('talking');
          }

          // Generowanie odpowiedzi głosowej
          const audioResponse = await ttsService.synthesize(response);
          
          // Sprawdź, czy odpowiedź to obiekt z typem web-tts
          if (audioResponse && audioResponse.type === 'web-tts') {
            // Wyślij tekst do przeglądarki do odczytania przez Web Speech API
            socket.emit('web-tts', audioResponse);
          } else {
            // Wyślij binarną odpowiedź audio (stary sposób)
            socket.emit('audio-response', audioResponse);
          }

          // Powrót do stanu "listening" po zakończeniu mówienia
          setTimeout(() => {
            if (novncServer) {
              novncServer.setAnimation('listening');
            }
          }, 1000);
        }
      } catch (error) {
        log.error('Błąd przetwarzania tekstu z Web Speech API:', error);
        socket.emit('error', { message: 'Wystąpił błąd podczas przetwarzania tekstu' });
      }
    });
    
    // Auto-start konwersacji po połączeniu
    setTimeout(async () => {
      const welcomeMessage = "Witaj w aplikacji VideoChat! Mikrofon został automatycznie włączony, możesz od razu zacząć mówić. Jak mogę Ci dziś pomóc?";

      // Zmiana stanu animacji na "talking"
      if (novncServer) {
        novncServer.setAnimation('talking');
      }

      // Wysłanie wiadomości powitalnej
      socket.emit('transcription', { assistant: welcomeMessage });

      // Generowanie odpowiedzi głosowej
      const audioResponse = await ttsService.synthesize(welcomeMessage);
      
      // Sprawdź, czy odpowiedź to obiekt z typem web-tts
      if (audioResponse && audioResponse.type === 'web-tts') {
        // Wyślij tekst do przeglądarki do odczytania przez Web Speech API
        socket.emit('web-tts', audioResponse);
      } else {
        // Wyślij binarną odpowiedź audio (stary sposób)
        socket.emit('audio-response', audioResponse);
      }

      // Powrót do stanu "listening" po zakończeniu mówienia
      setTimeout(() => {
        if (novncServer) {
          novncServer.setAnimation('listening');
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
  
  // Poczekaj na uruchomienie serwera przed utworzeniem okna
  httpServer.on('listening', () => {
    // Tworzenie okna aplikacji po uruchomieniu serwera
    createWindow();
    log.info('Okno aplikacji utworzone po uruchomieniu serwera');
  });
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