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
const LogMonitorService = require('./services/logMonitor');

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
let logMonitor = null;

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
    
    // Przekaż referencję do serwisu automatyzacji przeglądarki do LLM
    if (novncServer && novncServer.browserAutomation) {
      llmService.browserAutomation = novncServer.browserAutomation;
      
      // Dodaj obsługę komend przeglądarki z LLM
      llmService.on('browser-command', async (command) => {
        log.info(`Otrzymano komendę przeglądarki z LLM: ${command.action}`, command.params);
        
        try {
          switch (command.action) {
            case 'googleSearch':
              await novncServer.browserAutomation.navigateTo('https://www.google.com');
              await novncServer.browserAutomation.fillForm({ 'input[name="q"]': command.params.query });
              await novncServer.browserAutomation.clickElement('input[name="btnK"], button[type="submit"]');
              break;
              
            case 'formFill':
              await novncServer.browserAutomation.navigateTo('https://www.w3schools.com/html/html_forms.asp');
              await novncServer.browserAutomation.fillForm({
                'input[name="firstname"]': 'Test User',
                'input[name="lastname"]': 'Automation'
              });
              break;
              
            case 'navigateTo':
              await novncServer.browserAutomation.navigateTo(command.params.url);
              break;
              
            case 'takeScreenshot':
              await novncServer.browserAutomation.takeScreenshot('command-screenshot');
              break;
              
            case 'clickElement':
              // Próba znalezienia elementu po tekście lub selektorze
              await novncServer.browserAutomation.clickElement(command.params.target);
              break;
          }
        } catch (error) {
          log.error(`Błąd wykonywania komendy przeglądarki: ${error.message}`);
        }
      });
      
      log.info('Integracja LLM z automatyzacją przeglądarki zakończona pomyślnie');
    }
    
    // Inicjalizacja K3s w tle (jeśli potrzebne)
    k3sManager = new K3sManager({
      kubeconfig: path.join(appPath, 'kubernetes/kubeconfig')
    });

    if (process.env.USE_K3S === 'true') {
      await k3sManager.start();
    }
    
    // Inicjalizacja serwisu monitorowania logów
    if (novncServer && novncServer.browserAutomation) {
      logMonitor = new LogMonitorService();
      await logMonitor.initialize(novncServer.browserAutomation);
      log.info('Serwis monitorowania logów zainicjalizowany');
    } else {
      log.warn('Nie można zainicjalizować serwisu monitorowania logów - brak serwisu automatyzacji przeglądarki');
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
    log.info('Nowe połączenie Socket.IO');

    // Obsługa danych audio od klienta
    socket.on('audio-data', async (audioData) => {
      try {
        log.info('Otrzymano dane audio od klienta');
        
        // Przetwarzanie audio na tekst
        let transcription;
        try {
          transcription = await sttService.transcribe(audioData);
          log.info(`Transkrypcja: ${JSON.stringify(transcription)}`);
        } catch (error) {
          log.error('Błąd transkrypcji:', error);
          socket.emit('transcription', { assistant: 'Przepraszam, wystąpił błąd podczas przetwarzania mowy.' });
          return;
        }

        // Jeśli otrzymaliśmy obiekt z typem web-stt-request, wysyłamy żądanie do przeglądarki
        if (transcription && transcription.type === 'web-stt-request') {
          log.info('Wysyłanie żądania web-stt-request do przeglądarki');
          socket.emit('web-stt-request', transcription);
          return;
        }

        // Jeśli mamy transkrypcję, przetwarzamy ją przez LLM
        if (transcription && typeof transcription === 'string') {
          log.info(`Przetwarzanie transkrypcji przez LLM: "${transcription}"`);
          
          // Wysyłamy transkrypcję do klienta
          socket.emit('transcription', { user: transcription });
          
          // Przetwarzanie tekstu przez LLM
          try {
            const response = await llmService.processText(transcription);
            log.info(`Odpowiedź LLM: "${response}"`);
            
            // Wysyłamy odpowiedź do klienta
            socket.emit('transcription', { assistant: response });
            
            // Przetwarzanie tekstu na mowę
            try {
              const ttsResponse = await ttsService.synthesize(response);
              
              // Jeśli otrzymaliśmy obiekt z typem web-tts, wysyłamy go do przeglądarki
              if (ttsResponse && ttsResponse.type === 'web-tts') {
                log.info(`Wysyłanie żądania web-tts do przeglądarki: ${JSON.stringify(ttsResponse)}`);
                socket.emit('web-tts', ttsResponse);
              } else if (ttsResponse) {
                // W przeciwnym razie wysyłamy dane audio
                socket.emit('audio-response', ttsResponse);
              }
            } catch (error) {
              log.error('Błąd syntezy mowy:', error);
            }
          } catch (error) {
            log.error('Błąd przetwarzania tekstu przez LLM:', error);
            socket.emit('transcription', { assistant: 'Przepraszam, wystąpił błąd podczas przetwarzania tekstu.' });
          }
        }
      } catch (error) {
        log.error('Błąd przetwarzania danych audio:', error);
        socket.emit('transcription', { assistant: 'Przepraszam, wystąpił błąd podczas przetwarzania danych audio.' });
      }
    });

    // Obsługa wyników Web Speech API od klienta
    socket.on('web-stt-result', async (data) => {
      try {
        log.info(`Otrzymano wynik Web Speech API: ${JSON.stringify(data)}`);
        
        if (data && data.transcript) {
          // Wysyłamy transkrypcję do klienta
          socket.emit('transcription', { user: data.transcript });
          
          // Przetwarzanie tekstu przez LLM
          try {
            const response = await llmService.processText(data.transcript);
            log.info(`Odpowiedź LLM: "${response}"`);
            
            // Wysyłamy odpowiedź do klienta
            socket.emit('transcription', { assistant: response });
            
            // Przetwarzanie tekstu na mowę
            try {
              const ttsResponse = await ttsService.synthesize(response);
              
              // Jeśli otrzymaliśmy obiekt z typem web-tts, wysyłamy go do przeglądarki
              if (ttsResponse && ttsResponse.type === 'web-tts') {
                log.info(`Wysyłanie żądania web-tts do przeglądarki: ${JSON.stringify(ttsResponse)}`);
                socket.emit('web-tts', ttsResponse);
              } else if (ttsResponse) {
                // W przeciwnym razie wysyłamy dane audio
                socket.emit('audio-response', ttsResponse);
              }
            } catch (error) {
              log.error('Błąd syntezy mowy:', error);
            }
          } catch (error) {
            log.error('Błąd przetwarzania tekstu przez LLM:', error);
            socket.emit('transcription', { assistant: 'Przepraszam, wystąpił błąd podczas przetwarzania tekstu.' });
          }
        }
      } catch (error) {
        log.error('Błąd przetwarzania wyniku Web Speech API:', error);
        socket.emit('transcription', { assistant: 'Przepraszam, wystąpił błąd podczas przetwarzania wyniku rozpoznawania mowy.' });
      }
    });

    // Obsługa rozłączenia
    socket.on('disconnect', () => {
      log.info('Klient Socket.IO rozłączony');
    });
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