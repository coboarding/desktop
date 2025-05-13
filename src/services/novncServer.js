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
        
        // W rzeczywistej aplikacji należałoby skopiować pliki noVNC
        // lub skonfigurować webpack do ich dołączenia
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
        let frames = fs.readFileSync(animationPath, 'utf-8').split('FRAME');
        
        // Wybierz losową klatkę (lub sekwencyjnie w bardziej złożonej implementacji)
        const frameIndex = Math.floor(Math.random() * frames.length);
        return frames[frameIndex] || generateDefaultFrame();
      } catch (error) {
        log.error(`Błąd generowania klatki ASCII: ${error}`);
        return generateDefaultFrame();
      }
    };
    
    // Domyślna animacja, gdy brak pliku
    const generateDefaultFrame = () => {
      const states = {
        idle: `
   +----------------+
   |    __  __      |
   |   /  \\/  \\     |
   |  |  o\\/o  |    |
   |  |  _/\\_  |    |
   |   \\______/     |
   |      AI        |
   +----------------+
        `,
        talking: `
   +----------------+
   |    __  __      |
   |   /  \\/  \\     |
   |  |  o\\/o  |    |
   |  |  _\\/   |    |
   |   \\______/     |
   |      AI        |
   +----------------+
        `,
        listening: `
   +----------------+
   |    __  __      |
   |   /  \\/  \\     |
   |  |  o\\/o  |    |
   |  |   /\\_  |    |
   |   \\______/     |
   |      AI        |
   +----------------+
        `,
        thinking: `
   +----------------+
   |    __  __      |
   |   /  \\/  \\     |
   |  |  >\\/o  |    |
   |  |  _/\\_  |    |
   |   \\______/     |
   |      AI        |
   +----------------+
        `
      };
      
      return states[this.currentAnimation] || states.idle;
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