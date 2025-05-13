const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const log = require('electron-log');
const { app } = require('electron');

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

      // Uruchomienie serwera HTTP
      this.httpServer.listen(this.port, () => {
        log.info(`Serwer noVNC uruchomiony na porcie ${this.port}`);
        this.isRunning = true;
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
    }
    
    #ascii-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 14px;
      white-space: pre;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="ascii-container"></div>
  
  <script>
    // Połączenie WebSocket
    const socket = new WebSocket(\`ws://\${window.location.hostname}:\${window.location.port}\`);
    const container = document.getElementById('ascii-container');
    
    // Obsługa wiadomości
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'ascii-frame') {
          container.textContent = data.frame;
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