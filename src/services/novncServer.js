const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const log = require('electron-log');
const { app } = require('electron');

// Komponenty HTML i CSS
const htmlComponents = require('./novnc/htmlComponents');
const cssStyles = require('./novnc/cssStyles');
const clientScripts = require('./novnc/clientScripts');

// Stałe i konfiguracja
const CONFIG = {
  DEFAULT_PORT: 6080,
  FRAME_RATE: 250, // ms (4 klatki na sekundę)
  MAX_PORT_ATTEMPTS: 10
};

// Typy animacji
const ANIMATION_TYPES = {
  IDLE: 'idle',
  TALKING: 'talking',
  LISTENING: 'listening',
  THINKING: 'thinking'
};

class NoVNCServer {
  constructor(options = {}) {
    this.port = options.port || 6080;
    this.httpServer = null;
    this.webSocketServer = null;
    this.asciiProcess = null;
    this.appPath = app.getAppPath();
    this.novncPath = path.join(this.appPath, 'vendor/novnc');
    this.clients = new Set();
    this.currentAnimation = 'idle';
    this.isRunning = false;
  }

  // Funkcja do znajdowania dostępnego portu
  findAvailablePort(startPort, maxAttempts = 10) {
    return new Promise((resolve, reject) => {
      let currentPort = startPort;
      let attempts = 0;
      
      const tryPort = (port) => {
        const testServer = http.createServer();
        
        testServer.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            log.warn(`Port ${port} jest już zajęty, próbuję następny...`);
            testServer.close();
            
            // Spróbuj następny port
            if (attempts < maxAttempts) {
              attempts++;
              tryPort(port + 1);
            } else {
              reject(new Error(`Nie można znaleźć dostępnego portu po ${maxAttempts} próbach`));
            }
          } else {
            reject(err);
          }
        });
        
        testServer.once('listening', () => {
          testServer.close();
          resolve(port);
        });
        
        testServer.listen(port);
      };
      
      tryPort(currentPort);
    });
  }

  async initialize() {
    try {
      log.info('Inicjalizacja serwera noVNC...');
      
      // Sprawdź, czy katalog noVNC istnieje
      if (!fs.existsSync(this.novncPath)) {
        log.info('Katalog noVNC nie istnieje, tworzenie...');
        fs.mkdirSync(this.novncPath, { recursive: true });
        
        // Utwórz podstawowy plik vnc.html
        const vnchtmlPath = path.join(this.novncPath, 'vnc.html');
        fs.writeFileSync(vnchtmlPath, this.generateVncHtml());
      }

      // Znajdź dostępny port
      try {
        this.port = await this.findAvailablePort(this.port);
        log.info(`Znaleziono dostępny port dla noVNC: ${this.port}`);
      } catch (portError) {
        log.error(`Błąd podczas szukania dostępnego portu: ${portError.message}`);
        // Ustaw alternatywny port
        this.port = 0; // Pozwól systemowi wybrać dowolny dostępny port
      }

      // Konfiguracja serwera HTTP do serwowania plików noVNC
      this.httpServer = http.createServer((req, res) => {
        // Prosty serwer plików dla noVNC
        let filePath = '';

        if (req.url === '/') {
          filePath = path.join(this.novncPath, 'vnc.html');
        } else {
          filePath = path.join(this.novncPath, req.url);
        }

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
          }

          // Określ typ MIME na podstawie rozszerzenia pliku
          const ext = path.extname(filePath);
          let contentType = 'text/html';

          switch (ext) {
            case '.js':
              contentType = 'text/javascript';
              break;
            case '.css':
              contentType = 'text/css';
              break;
            case '.json':
              contentType = 'application/json';
              break;
            case '.png':
              contentType = 'image/png';
              break;
            case '.jpg':
              contentType = 'image/jpeg';
              break;
          }

          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      });

      // Konfiguracja serwera WebSocket dla noVNC
      this.webSocketServer = new WebSocket.Server({
        server: this.httpServer
      });

      this.webSocketServer.on('connection', (socket) => {
        log.info('Nowe połączenie WebSocket z noVNC');
        this.clients.add(socket);

        socket.on('message', (message) => {
          // Obsługa wiadomości od klienta
          log.info(`Wiadomość od klienta noVNC: ${message}`);
        });

        socket.on('close', () => {
          this.clients.delete(socket);
          log.info('Klient noVNC rozłączony');
        });

        // Rozpocznij wysyłanie animacji ASCII
        this.startSendingAsciiFrames(socket);
      });

      // Uruchomienie serwera HTTP z obsługą błędów
      return new Promise((resolve, reject) => {
        this.httpServer.on('error', (err) => {
          log.error(`Błąd podczas uruchamiania serwera noVNC: ${err.message}`);
          reject(err);
        });
        
        this.httpServer.listen(this.port, () => {
          // Pobierz rzeczywisty port przydzielony przez system
          const actualPort = this.httpServer.address().port;
          this.port = actualPort;
          log.info(`Serwer noVNC uruchomiony na porcie ${this.port}`);
          this.isRunning = true;
          resolve(true);
        });
      });

      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji serwera noVNC:', error);
      return false;
    }
  }

  setAnimation(animationType) {
    if (this.currentAnimation !== animationType) {
      log.info(`Zmiana animacji ASCII na: ${animationType}`);
      this.currentAnimation = animationType;
    }
  }

  async startSendingAsciiFrames(socket) {
    // Funkcja generująca klatki animacji ASCII
    const generateAsciiFrame = () => {
      // Pobierz odpowiednią animację na podstawie stanu
      const animationPath = path.join(
        this.appPath,
        `src/ascii-animations/${this.currentAnimation}.txt`
      );

      try {
        // W prostej implementacji wczytujemy gotowe klatki
        if (fs.existsSync(animationPath)) {
          let frames = fs.readFileSync(animationPath, 'utf-8').split('FRAME');
          // Usuń puste klatki
          frames = frames.filter(frame => frame.trim().length > 0);

          // Wybierz losową klatkę (lub sekwencyjnie w bardziej złożonej implementacji)
          const frameIndex = Math.floor(Math.random() * frames.length);
          return frames[frameIndex] || this.generateDefaultFrame();
        } else {
          return this.generateDefaultFrame();
        }
      } catch (error) {
        log.error(`Błąd generowania klatki ASCII: ${error}`);
        return this.generateDefaultFrame();
      }
    };

    // Pętla wysyłająca klatki
    const sendFrames = () => {
      if (socket.readyState === WebSocket.OPEN) {
        const frame = generateAsciiFrame();
        socket.send(JSON.stringify({
          type: 'ascii-frame',
          frame: frame
        }));

        setTimeout(sendFrames, 250); // 4 klatki na sekundę
      }
    };

    // Rozpocznij wysyłanie klatek
    sendFrames();
  }

  // Domyślna animacja, gdy brak pliku
  generateDefaultFrame() {
    const states = {
      idle: `
   +----------------+
   |                |
   |    /\\    /\\    |
   |   /  \\  /  \\   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \\__/  \\__/   |
   |                |
   |      ----      |
   |                |
   +----------------+
        `,
      talking: `
   +----------------+
   |                |
   |    /\\    /\\    |
   |   /  \\  /  \\   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \\__/  \\__/   |
   |                |
   |      ====      |
   |                |
   +----------------+
        `,
      listening: `
   +----------------+
   |                |
   |    /\\    /\\    |
   |   /  \\  /  \\   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \\__/  \\__/   |
   |                |
   |      ....      |
   |                |
   +----------------+
        `,
      thinking: `
   +----------------+
   |                |
   |    /\\    /\\    |
   |   /  \\  /  \\   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \\__/  \\__/   |
   |                |
   |      ????      |
   |                |
   +----------------+
        `
    };

    return states[this.currentAnimation] || states.idle;
  }

  // Generowanie pliku HTML dla noVNC
  generateVncHtml() {
    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCII Animation</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      background-color: #282a36;
      color: #50fa7b;
      font-family: 'Courier New', monospace;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    #ascii-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 24px;
      white-space: pre;
      text-align: center;
      line-height: 1.2;
      padding: 20px;
      box-sizing: border-box;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }
    
    .status {
      position: fixed;
      bottom: 10px;
      right: 10px;
      padding: 5px 10px;
      background-color: rgba(80, 250, 123, 0.3);
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="ascii-container"></div>
  <div class="status">Asystent VideoChat LLM</div>
  
  <script>
    // Połączenie WebSocket
    const socket = new WebSocket(\`ws://\${window.location.hostname}:\${window.location.port}\`);
    const container = document.getElementById('ascii-container');
    
    // Dostosuj rozmiar czcionki do rozmiaru okna
    function adjustFontSize() {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Zakładamy, że ASCII art ma około 20 znaków szerokości i 12 linii wysokości
      const idealCharWidth = containerWidth / 20;
      const idealCharHeight = containerHeight / 12;
      
      // Wybierz mniejszą wartość, aby zapewnić, że cały ASCII art będzie widoczny
      const fontSize = Math.min(idealCharWidth, idealCharHeight * 2);
      
      container.style.fontSize = '\' + fontSize + 'px';
    }
    
    // Dostosuj rozmiar przy ładowaniu i zmianie rozmiaru okna
    window.addEventListener('load', adjustFontSize);
    window.addEventListener('resize', adjustFontSize);
    
    // Obsługa wiadomości
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'ascii-frame') {
          container.textContent = data.frame;
          adjustFontSize();
        }
      } catch (error) {
        console.error('Błąd przetwarzania wiadomości:', error);
      }
    });
    
    // Obsługa błędów
    socket.addEventListener('error', (error) => {
      console.error('Błąd WebSocket:', error);
    });
    
    socket.addEventListener('close', () => {
      console.log('Połączenie WebSocket zamknięte');
      container.textContent = 'Połączenie przerwane. Odświeżyć stronę?';
    });
  </script>
</body>
</html>`;
  }
  
  async stop() {
    if (this.isRunning) {
      log.info('Zatrzymywanie serwera noVNC...');
      
      // Zamknij wszystkie połączenia WebSocket
      for (const client of this.clients) {
        client.close();
      }
      
      // Zamknij serwer HTTP
      if (this.httpServer) {
        this.httpServer.close();
      }
      
      this.isRunning = false;
      log.info('Serwer noVNC zatrzymany');
    }
    
    return true;
  }
}

module.exports = NoVNCServer;