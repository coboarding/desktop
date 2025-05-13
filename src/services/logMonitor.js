const fs = require('fs');
const path = require('path');
const os = require('os');
const log = require('electron-log');
const { BrowserAutomationService } = require('./browserAutomation');

class LogMonitorService {
  constructor(options = {}) {
    this.initialized = false;
    this.logPath = options.logPath || path.join(os.homedir(), '.config', 'videochat-llm-app', 'logs', 'main.log');
    this.checkInterval = options.checkInterval || 5000; // Sprawdzaj co 5 sekund
    this.lastReadPosition = 0;
    this.intervalId = null;
    this.errorPatterns = [
      {
        pattern: /net::ERR_NAME_NOT_RESOLVED/i,
        fix: this._fixNetworkResolutionError.bind(this)
      },
      {
        pattern: /Błąd dostępu do mikrofonu/i,
        fix: this._fixMicrophoneAccessError.bind(this)
      },
      {
        pattern: /Error: Navigation failed/i,
        fix: this._fixNavigationError.bind(this)
      },
      {
        pattern: /Error: Browser context/i,
        fix: this._fixBrowserContextError.bind(this)
      }
    ];
    
    this.browserAutomation = null;
  }

  async initialize(browserAutomation) {
    try {
      log.info('Inicjalizacja serwisu monitorowania logów');
      
      // Zapisz referencję do serwisu automatyzacji przeglądarki
      this.browserAutomation = browserAutomation;
      
      // Sprawdź czy plik logów istnieje
      if (!fs.existsSync(this.logPath)) {
        log.warn(`Plik logów nie istnieje: ${this.logPath}`);
        // Utwórz katalog logów, jeśli nie istnieje
        const logDir = path.dirname(this.logPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        // Utwórz pusty plik logów
        fs.writeFileSync(this.logPath, '');
      }
      
      // Ustaw początkową pozycję odczytu na koniec pliku
      const stats = fs.statSync(this.logPath);
      this.lastReadPosition = stats.size;
      
      this.initialized = true;
      log.info('Serwis monitorowania logów zainicjalizowany pomyślnie');
      
      // Rozpocznij monitorowanie logów
      this.startMonitoring();
      
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji serwisu monitorowania logów:', error);
      throw error;
    }
  }
  
  startMonitoring() {
    if (!this.initialized) {
      throw new Error('Serwis monitorowania logów nie został zainicjalizowany');
    }
    
    log.info('Rozpoczęcie monitorowania logów');
    
    // Zatrzymaj istniejący interwał, jeśli istnieje
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Ustaw nowy interwał monitorowania
    this.intervalId = setInterval(() => {
      this._checkLogs();
    }, this.checkInterval);
  }
  
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      log.info('Zatrzymano monitorowanie logów');
    }
  }
  
  async _checkLogs() {
    try {
      // Sprawdź czy plik logów istnieje
      if (!fs.existsSync(this.logPath)) {
        return;
      }
      
      // Odczytaj nowe logi
      const stats = fs.statSync(this.logPath);
      if (stats.size <= this.lastReadPosition) {
        // Plik został zresetowany lub zmniejszony
        this.lastReadPosition = 0;
      }
      
      if (stats.size > this.lastReadPosition) {
        // Odczytaj tylko nowe dane
        const buffer = Buffer.alloc(stats.size - this.lastReadPosition);
        const fileHandle = fs.openSync(this.logPath, 'r');
        fs.readSync(fileHandle, buffer, 0, buffer.length, this.lastReadPosition);
        fs.closeSync(fileHandle);
        
        const newLogs = buffer.toString('utf8');
        this.lastReadPosition = stats.size;
        
        // Analizuj nowe logi
        this._analyzeLogs(newLogs);
      }
    } catch (error) {
      log.error('Błąd podczas sprawdzania logów:', error);
    }
  }
  
  _analyzeLogs(logContent) {
    // Podziel logi na linie
    const lines = logContent.split('\n');
    
    for (const line of lines) {
      // Sprawdź każdy wzorzec błędu
      for (const errorPattern of this.errorPatterns) {
        if (errorPattern.pattern.test(line)) {
          log.info(`Wykryto błąd: ${line}`);
          // Wywołaj funkcję naprawiającą
          errorPattern.fix(line);
          break;
        }
      }
    }
  }
  
  async _fixNetworkResolutionError(logLine) {
    log.info('Próba naprawy błędu rozwiązywania nazw DNS');
    
    try {
      if (this.browserAutomation) {
        // Spróbuj ponownie załadować stronę z alternatywnym adresem
        const url = logLine.match(/https?:\/\/[^\s/$.?#].[^\s]*/i)?.[0] || 'https://www.google.com';
        
        // Sprawdź połączenie internetowe
        log.info('Sprawdzanie połączenia internetowego...');
        
        // Spróbuj załadować alternatywny adres
        const alternativeUrl = 'https://1.1.1.1';
        await this.browserAutomation.navigateTo(alternativeUrl);
        log.info(`Pomyślnie załadowano stronę testową: ${alternativeUrl}`);
        
        // Spróbuj ponownie załadować oryginalną stronę
        setTimeout(async () => {
          try {
            await this.browserAutomation.navigateTo(url);
            log.info(`Pomyślnie załadowano stronę po naprawie: ${url}`);
          } catch (error) {
            log.error(`Nie udało się załadować strony po naprawie: ${error.message}`);
          }
        }, 2000);
      }
    } catch (error) {
      log.error('Błąd podczas naprawy problemu z DNS:', error);
    }
  }
  
  async _fixMicrophoneAccessError(logLine) {
    log.info('Próba naprawy błędu dostępu do mikrofonu');
    
    try {
      if (this.browserAutomation) {
        // Spróbuj przyznać uprawnienia do mikrofonu
        await this.browserAutomation.grantPermissions(['microphone']);
        log.info('Przyznano uprawnienia do mikrofonu');
      }
    } catch (error) {
      log.error('Błąd podczas naprawy problemu z mikrofonem:', error);
    }
  }
  
  async _fixNavigationError(logLine) {
    log.info('Próba naprawy błędu nawigacji');
    
    try {
      if (this.browserAutomation) {
        // Spróbuj odświeżyć stronę
        await this.browserAutomation.refresh();
        log.info('Odświeżono stronę po błędzie nawigacji');
      }
    } catch (error) {
      log.error('Błąd podczas naprawy problemu z nawigacją:', error);
    }
  }
  
  async _fixBrowserContextError(logLine) {
    log.info('Próba naprawy błędu kontekstu przeglądarki');
    
    try {
      if (this.browserAutomation) {
        // Spróbuj zrestartować przeglądarkę
        await this.browserAutomation.restart();
        log.info('Zrestartowano przeglądarkę po błędzie kontekstu');
      }
    } catch (error) {
      log.error('Błąd podczas naprawy problemu z kontekstem przeglądarki:', error);
    }
  }
}

module.exports = LogMonitorService;
