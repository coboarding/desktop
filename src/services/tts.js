const fs = require('fs');
const path = require('path');
const log = require('electron-log');

class TTSService {
  constructor(options) {
    this.modelPath = options.modelPath;
    this.initialized = false;
    this.useWebAPI = true; // Zawsze używaj Web Speech API
  }

  async initialize() {
    try {
      log.info(`Inicjalizacja serwisu TTS`);
      
      // Sprawdź, czy katalog modelu istnieje
      if (fs.existsSync(this.modelPath)) {
        log.info('Katalog modeli TTS istnieje, ale używamy Web Speech API');
      } else {
        log.warn(`Model TTS nie znaleziony: ${this.modelPath}`);
        log.info('Używanie Web Speech API dla TTS');
        
        // Utwórz katalog dla modeli, jeśli nie istnieje
        fs.mkdirSync(this.modelPath, { recursive: true });
      }

      this.initialized = true;
      log.info('Serwis TTS zainicjalizowany pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji serwisu TTS:', error);
      throw error;
    }
  }

  async synthesize(text) {
    if (!this.initialized) {
      throw new Error('Serwis TTS nie został zainicjalizowany');
    }

    try {
      log.info(`Synteza tekstu na mowę: ${text}`);

      // Zwracamy obiekt z tekstem do odczytania przez Web Speech API w przeglądarce
      return {
        type: 'web-tts',
        text: text,
        options: {
          lang: 'pl-PL',
          volume: 1.0,
          rate: 1.0,
          pitch: 1.0
        }
      };
    } catch (error) {
      log.error('Błąd syntezy mowy:', error);
      throw error;
    }
  }
}

module.exports = TTSService;