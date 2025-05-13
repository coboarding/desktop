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
const browserAutomationUI = require('./novnc/browserAutomationUI');

// Browser Automation Service
const BrowserAutomationService = require('./browserAutomation');

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
    this.uiMode = options.uiMode || 'ascii'; // 'ascii' lub 'browser'
    
    // Inicjalizacja usługi automatyzacji przeglądarki
    this.browserAutomation = new BrowserAutomationService({
      screenshotDir: path.join(this.appPath, 'screenshots'),
      videoDir: path.join(this.appPath, 'videos'),
      headless: options.headlessBrowser !== false,
      recordVideo: options.recordVideo || false
    });
    
    // Opcje konfiguracyjne
    this.config = {
      frameRate: options.frameRate || CONFIG.FRAME_RATE,
      maxPortAttempts: options.maxPortAttempts || CONFIG.MAX_PORT_ATTEMPTS,
      defaultBrowserUrl: options.defaultBrowserUrl || 'https://www.google.com'
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

      // Inicjalizacja usługi automatyzacji przeglądarki
      await this.browserAutomation.initialize();
      
      // Jeśli tryb UI to 'browser', uruchom przeglądarkę
      if (this.uiMode === 'browser') {
        await this.browserAutomation.startBrowser();
        await this.browserAutomation.navigateTo(this.config.defaultBrowserUrl);
      }

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

    // W zależności od trybu UI, rozpocznij odpowiednie działania
    if (this.uiMode === 'browser') {
      // Wyślij informację o aktualnym URL przeglądarki
      if (this.browserAutomation.isRunning && this.browserAutomation.currentUrl) {
        socket.send(JSON.stringify({
          type: 'browser-update',
          updateType: 'url',
          url: this.browserAutomation.currentUrl
        }));
      }
    } else {
      // Rozpocznij wysyłanie animacji ASCII
      this.startSendingAsciiFrames(socket);
    }
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
      } else if (data.type === 'browser-command' && this.uiMode === 'browser') {
        // Obsługa komend automatyzacji przeglądarki
        this._handleBrowserCommand(socket, data);
      }
      
      log.info(`Wiadomość od klienta noVNC: ${JSON.stringify(data)}`);
    } catch (error) {
      log.error(`Błąd przetwarzania wiadomości WebSocket: ${error}`);
    }
  }
  
  /**
   * Obsługa komend automatyzacji przeglądarki
   * @private
   * @param {WebSocket} socket - Połączenie WebSocket klienta
   * @param {Object} data - Dane komendy
   */
  async _handleBrowserCommand(socket, data) {
    if (!this.browserAutomation) {
      this._sendBrowserUpdate(socket, 'error', 'Usługa automatyzacji przeglądarki nie jest dostępna');
      return;
    }
    
    try {
      const { command, data: commandData } = data;
      log.info(`Otrzymano komendę przeglądarki: ${command}`);
      
      // Jeśli przeglądarka nie jest uruchomiona, uruchom ją (z wyjątkiem komendy stop)
      if (!this.browserAutomation.isRunning && command !== 'stop') {
        await this.browserAutomation.startBrowser();
      }
      
      // Obsługa różnych komend
      switch (command) {
        case 'navigate':
          if (commandData && commandData.url) {
            this._sendBrowserUpdate(socket, 'status', `Przechodzenie do ${commandData.url}...`);
            const success = await this.browserAutomation.navigateTo(commandData.url);
            if (success) {
              this._sendBrowserUpdate(socket, 'navigation', this.browserAutomation.currentUrl);
            } else {
              this._sendBrowserUpdate(socket, 'error', `Nie można przejść do ${commandData.url}`);
            }
          }
          break;
          
        case 'back':
          if (this.browserAutomation.page) {
            await this.browserAutomation.page.goBack();
            this._sendBrowserUpdate(socket, 'navigation', this.browserAutomation.page.url());
          }
          break;
          
        case 'forward':
          if (this.browserAutomation.page) {
            await this.browserAutomation.page.goForward();
            this._sendBrowserUpdate(socket, 'navigation', this.browserAutomation.page.url());
          }
          break;
          
        case 'refresh':
          if (this.browserAutomation.page) {
            await this.browserAutomation.page.reload();
            this._sendBrowserUpdate(socket, 'navigation', this.browserAutomation.page.url());
          }
          break;
          
        case 'screenshot':
          this._sendBrowserUpdate(socket, 'status', 'Wykonywanie zrzutu ekranu...');
          const screenshotPath = await this.browserAutomation.takeScreenshot();
          if (screenshotPath) {
            this._sendBrowserUpdate(socket, 'status', `Zrzut ekranu zapisany: ${screenshotPath}`);
          } else {
            this._sendBrowserUpdate(socket, 'error', 'Nie można wykonać zrzutu ekranu');
          }
          break;
          
        case 'click':
          if (commandData && commandData.selector) {
            const clicked = await this.browserAutomation.clickElement(commandData.selector);
            if (!clicked) {
              this._sendBrowserUpdate(socket, 'error', `Nie można kliknąć elementu: ${commandData.selector}`);
            }
          }
          break;
          
        case 'fill':
          if (commandData && commandData.formData) {
            const filled = await this.browserAutomation.fillForm(commandData.formData);
            if (!filled) {
              this._sendBrowserUpdate(socket, 'error', 'Nie można wypełnić formularza');
            }
          }
          break;
          
        case 'run-scenario':
          if (commandData && commandData.scenario) {
            this._sendBrowserUpdate(socket, 'status', 'Uruchamianie scenariusza testu...');
            const result = await this.browserAutomation.runTestScenario(commandData.scenario);
            if (result.success) {
              this._sendBrowserUpdate(socket, 'status', 'Scenariusz testu zakończony pomyślnie');
            } else {
              this._sendBrowserUpdate(socket, 'error', `Błąd scenariusza testu: ${result.error || 'Nieznany błąd'}`);
            }
          }
          break;
          
        case 'googleSearch':
          if (commandData && commandData.query) {
            this._sendBrowserUpdate(socket, 'status', `Wyszukiwanie w Google: ${commandData.query}...`);
            try {
              // Przejdź do Google
              await this.browserAutomation.navigateTo('https://www.google.com');
              
              // Wypełnij pole wyszukiwania
              await this.browserAutomation.fillForm({ 'input[name="q"]': commandData.query });
              
              // Kliknij przycisk wyszukiwania
              await this.browserAutomation.clickElement('input[name="btnK"], button[type="submit"]');
              
              // Poczekaj na wyniki wyszukiwania
              await this.browserAutomation.page.waitForSelector('#search', { timeout: 5000 }).catch(() => {});
              
              // Wykonaj zrzut ekranu wyników
              await this.browserAutomation.takeScreenshot('google-search-results');
              
              this._sendBrowserUpdate(socket, 'status', `Wyszukiwanie zakończone: ${commandData.query}`);
            } catch (error) {
              this._sendBrowserUpdate(socket, 'error', `Błąd wyszukiwania w Google: ${error.message}`);
            }
          }
          break;
          
        case 'formFill':
          this._sendBrowserUpdate(socket, 'status', 'Wypełnianie formularza testowego...');
          try {
            // Przejdź do strony z formularzem
            await this.browserAutomation.navigateTo('https://www.w3schools.com/html/html_forms.asp');
            
            // Wypełnij formularz
            await this.browserAutomation.fillForm({
              'input[name="firstname"]': 'Test User',
              'input[name="lastname"]': 'Automation'
            });
            
            // Wykonaj zrzut ekranu wypełnionego formularza
            await this.browserAutomation.takeScreenshot('form-filled');
            
            this._sendBrowserUpdate(socket, 'status', 'Formularz wypełniony pomyślnie');
          } catch (error) {
            this._sendBrowserUpdate(socket, 'error', `Błąd wypełniania formularza: ${error.message}`);
          }
          break;
          
        case 'stop':
          await this.browserAutomation.stopBrowser();
          this._sendBrowserUpdate(socket, 'status', 'Przeglądarka zatrzymana');
          break;
          
        default:
          this._sendBrowserUpdate(socket, 'error', `Nieznana komenda: ${command}`);
      }
    } catch (error) {
      log.error(`Błąd podczas wykonywania komendy przeglądarki: ${error}`);
      this._sendBrowserUpdate(socket, 'error', `Błąd: ${error.message}`);
    }
  }
  
  /**
   * Wysyła aktualizację stanu przeglądarki do klienta
   * @private
   * @param {WebSocket} socket - Połączenie WebSocket klienta
   * @param {string} updateType - Typ aktualizacji
   * @param {string} message - Treść aktualizacji
   */
  _sendBrowserUpdate(socket, updateType, message) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'browser-update',
        updateType,
        message,
        url: this.browserAutomation && this.browserAutomation.currentUrl
      }));
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
    // W zależności od trybu UI, generuj odpowiedni HTML
    if (this.uiMode === 'browser') {
      // Tryb automatyzacji przeglądarki
      const browserUI = browserAutomationUI.generateBrowserAutomationInterface();
      return htmlComponents.generateMainHtml(
        `<style>${browserUI.css}</style><script>${browserUI.script}</script>`,
        browserUI.html
      );
    } else {
      // Domyślny tryb ASCII
      return htmlComponents.generateMainHtml();
    }
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
