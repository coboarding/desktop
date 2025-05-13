const fs = require('fs');
const path = require('path');
const { Whisper } = require('whisper-node');
const log = require('electron-log');

class STTService {
  constructor(options) {
    this.modelPath = options.modelPath;
    this.whisper = null;
    this.initialized = false;
  }
  
  async initialize() {
    try {
      log.info(`Inicjalizacja modelu STT: ${this.modelPath}`);
      
      if (!fs.existsSync(this.modelPath)) {
        log.error(`Model STT nie znaleziony: ${this.modelPath}`);
        throw new Error('Model STT nie znaleziony');
      }
      
      // Inicjalizacja Whisper (lub innego modelu STT)
      this.whisper = new Whisper({
        modelPath: this.modelPath,
        language: 'pl'  // Polski
      });
      
      this.initialized = true;
      log.info('Model STT zainicjalizowany pomyślnie');
    } catch (error) {
      log.error('Błąd inicjalizacji modelu STT:', error);
      throw error;
    }
  }
  
  async transcribe(audioData) {
    if (!this.initialized) {
      throw new Error('Model STT nie został zainicjalizowany');
    }
    
    try {
      // Konwersja danych audio do formatu obsługiwanego przez model
      const tempAudioPath = path.join(process.env.TEMP || '/tmp', `audio_${Date.now()}.wav`);
      fs.writeFileSync(tempAudioPath, Buffer.from(audioData));
      
      // Transkrypcja audio
      const result = await this.whisper.transcribe(tempAudioPath);
      
      // Usunięcie pliku tymczasowego
      fs.unlinkSync(tempAudioPath);
      
      return result.text;
    } catch (error) {
      log.error('Błąd transkrypcji audio:', error);
      throw error;
    }
  }
}

module.exports = STTService;