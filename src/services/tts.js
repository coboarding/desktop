const fs = require('fs');
const path = require('path');
const PicoTTS = require('pico-tts');
const log = require('electron-log');

class TTSService {
  constructor(options) {
    this.modelPath = options.modelPath;
    this.tts = null;
    this.initialized = false;
  }
  
  async initialize() {
    try {
      log.info(`Inicjalizacja modelu TTS: ${this.modelPath}`);
      
      if (!fs.existsSync(this.modelPath)) {
        log.error(`Model TTS nie znaleziony: ${this.modelPath}`);
        throw new Error('Model TTS nie znaleziony');
      }
      
      // Inicjalizacja PicoTTS (lub innego modelu TTS)
      this.tts = new PicoTTS();
      
      this.initialized = true;
      log.info('Model TTS zainicjalizowany pomyślnie');
    } catch (error) {
      log.error('Błąd inicjalizacji modelu TTS:', error);
      throw error;
    }
  }
  
  async synthesize(text) {
    if (!this.initialized) {
      throw new Error('Model TTS nie został zainicjalizowany');
    }
    
    try {
      // Synteza mowy
      const audioBuffer = await this.tts.synthesize(text, 'pl-PL');
      
      // Zwrócenie danych audio
      return audioBuffer;
    } catch (error) {
      log.error('Błąd syntezy mowy:', error);
      throw error;
    }
  }
}

module.exports = TTSService;