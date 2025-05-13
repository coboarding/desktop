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
    this.port = options.port || CONFIG.DEFAULT_PORT;
    this.httpServer = null;
    this.webSocketServer = null;
    this.asciiProcess = null;
    this.appPath = app.getAppPath();
    this.novncPath = path.join(this.appPath, 'vendor/novnc');
    this.clients = new Set();
    this.currentAnimation = ANIMATION_TYPES.IDLE;
    this.isRunning = false;
    
    // Opcje konfiguracyjne
    this.config = {
      frameRate: options.frameRate || CONFIG.FRAME_RATE,
      maxPortAttempts: options.maxPortAttempts || CONFIG.MAX_PORT_ATTEMPTS
    };
  }

  // Funkcja do znajdowania dostępnego portu
  async findAvailablePort(startPort, maxAttempts = 10) {
    const networkUtils = require('./novnc/networkUtils');
    return networkUtils.findAvailablePort(startPort, maxAttempts);
  }

  /**
   * Inicjalizacja serwera noVNC
   * @returns {Promise<boolean>} - Promise zwracający true jeśli inicjalizacja się powiodła
   */
  async initialize() {
    try {
      log.info('Inicjalizacja serwera noVNC...');
      
      // Przygotuj katalog i pliki noVNC
      await this._prepareNoVNCDirectory();

      // Znajdź dostępny port
      await this._setupPort();

      // Konfiguracja serwera HTTP
      this._setupHttpServer();

      // Konfiguracja serwera WebSocket
      this._setupWebSocketServer();

      // Uruchomienie serwera
      await this._startServer();
      
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji serwera noVNC:', error);
      return false;
    }
  }
  
  /**
   * Przygotowanie katalogu noVNC i plików
   * @private
   */
  async _prepareNoVNCDirectory() {
    if (!fs.existsSync(this.novncPath)) {
      log.info('Katalog noVNC nie istnieje, tworzenie...');
      fs.mkdirSync(this.novncPath, { recursive: true });
      
      // Utwórz podstawowy plik vnc.html
      const vnchtmlPath = path.join(this.novncPath, 'vnc.html');
      fs.writeFileSync(vnchtmlPath, this._generateVncHtml());
    }
  }
  
  /**
   * Konfiguracja portu dla serwera
   * @private
   */
  async _setupPort() {
    try {
      this.port = await this.findAvailablePort(this.port, this.config.maxPortAttempts);
      log.info(`Znaleziono dostępny port dla noVNC: ${this.port}`);
    } catch (portError) {
      log.error(`Błąd podczas szukania dostępnego portu: ${portError.message}`);
      // Ustaw alternatywny port
      this.port = 0; // Pozwól systemowi wybrać dowolny dostępny port
    }
  }
  
  /**
   * Konfiguracja serwera HTTP
   * @private
   */
  _setupHttpServer() {
    this.httpServer = http.createServer(this._handleHttpRequest.bind(this));
  }
  
  /**
   * Obsługa żądań HTTP
   * @private
   */
  _handleHttpRequest(req, res) {
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
  }
  
  /**
   * Konfiguracja serwera WebSocket
   * @private
   */
  _setupWebSocketServer() {
    this.webSocketServer = new WebSocket.Server({
      server: this.httpServer
    });

    this.webSocketServer.on('connection', this._handleWebSocketConnection.bind(this));
  }
  
  /**
   * Obsługa nowych połączeń WebSocket
   * @private
   */
  _handleWebSocketConnection(socket) {
    log.info('Nowe połączenie WebSocket z noVNC');
    this.clients.add(socket);

    socket.on('message', (message) => {
      this._handleWebSocketMessage(socket, message);
    });

    socket.on('close', () => {
      this.clients.delete(socket);
      log.info('Klient noVNC rozłączony');
    });

    // Rozpocznij wysyłanie animacji ASCII
    this.startSendingAsciiFrames(socket);
  }
  
  /**
   * Obsługa wiadomości WebSocket
   * @private
   */
  _handleWebSocketMessage(socket, message) {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'control-animation' && data.animationType) {
        this.setAnimation(data.animationType);
      }
      
      log.info(`Wiadomość od klienta noVNC: ${message}`);
    } catch (error) {
      log.error(`Błąd przetwarzania wiadomości WebSocket: ${error}`);
    }
  }
  
  /**
   * Uruchomienie serwera HTTP
   * @private
   */
  async _startServer() {
    const networkUtils = require('./novnc/networkUtils');
    
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
  }

  /**
   * Ustawia typ animacji ASCII
   * @param {string} animationType - Typ animacji do ustawienia
   */
  setAnimation(animationType) {
    if (this.currentAnimation !== animationType) {
      log.info(`Zmiana animacji ASCII na: ${animationType}`);
      this.currentAnimation = animationType;
      
      // Powiadom wszystkich klientów o zmianie animacji
      this._notifyClientsAboutAnimationChange(animationType);
    }
  }
  
  /**
   * Powiadamia wszystkich klientów o zmianie animacji
   * @private
   * @param {string} animationType - Nowy typ animacji
   */
  _notifyClientsAboutAnimationChange(animationType) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'animation-change',
          animationType: animationType
        }));
      }
    });
  }

  /**
   * Rozpoczyna wysyłanie klatek animacji ASCII do klienta
   * @param {WebSocket} socket - Połączenie WebSocket klienta
   */
  async startSendingAsciiFrames(socket) {
    const asciiAnimations = require('./novnc/asciiAnimations');
    
    // Pętla wysyłająca klatki
    const sendFrames = () => {
      if (socket.readyState === WebSocket.OPEN) {
        const frame = this._generateAsciiFrame();
        socket.send(JSON.stringify({
          type: 'ascii-frame',
          frame: frame
        }));

        setTimeout(sendFrames, this.config.frameRate);
      }
    };

    // Rozpocznij wysyłanie klatek
    sendFrames();
  }
  
  /**
   * Generuje klatkę animacji ASCII
   * @private
   * @returns {string} - Klatka animacji ASCII
   */
  _generateAsciiFrame() {
    const asciiAnimations = require('./novnc/asciiAnimations');
    return asciiAnimations.getAnimationFrame(this.appPath, this.currentAnimation);
  }

  /**
   * Generuje HTML dla interfejsu noVNC
   * @private
   * @returns {string} - Kod HTML dla interfejsu noVNC
   */
  _generateVncHtml() {
    return htmlComponents.generateMainHtml();
  }
  
  /**
   * Zatrzymuje serwer noVNC
   * @returns {Promise<boolean>} - Promise zwracający true jeśli zatrzymanie się powiodło
   */
  async stop() {
    if (this.isRunning) {
      log.info('Zatrzymywanie serwera noVNC...');
      
      // Zamknij wszystkie połączenia WebSocket
      this._closeAllConnections();
      
      // Zatrzymaj serwer HTTP
      await this._stopHttpServer();
      
      this.isRunning = false;
      return true;
    }
    
    return false;
  }
  
  /**
   * Zamyka wszystkie połączenia WebSocket
   * @private
   */
  _closeAllConnections() {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    
    // Wyczyść zbiór klientów
    this.clients.clear();
  }
  
  /**
   * Zatrzymuje serwer HTTP
   * @private
   * @returns {Promise<void>}
   */
  async _stopHttpServer() {
    if (this.httpServer) {
      return new Promise(resolve => {
        this.httpServer.close(() => {
          log.info('Serwer HTTP noVNC zatrzymany');
          resolve();
        });
      });
    }
    
    return Promise.resolve();
  }
}

module.exports = NoVNCServer;
