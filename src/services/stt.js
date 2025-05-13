const fs = require('fs');
const path = require('path');
const log = require('electron-log');

class STTService {
  constructor(options) {
    this.modelPath = options.modelPath;
    this.initialized = false;
    this.useWebAPI = true; // Zawsze używaj Web Speech API
  }

  async initialize() {
    try {
      log.info(`Inicjalizacja serwisu STT`);
      
      // Sprawdź, czy katalog modelu istnieje
      if (fs.existsSync(this.modelPath)) {
        log.info('Katalog modeli STT istnieje, ale używamy Web Speech API');
      } else {
        log.warn(`Model STT nie znaleziony: ${this.modelPath}`);
        log.info('Używanie Web Speech API dla STT');
        
        // Utwórz katalog dla modeli, jeśli nie istnieje
        fs.mkdirSync(this.modelPath, { recursive: true });
      }

      this.initialized = true;
      log.info('Serwis STT zainicjalizowany pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji serwisu STT:', error);
      throw error;
    }
  }

  async transcribe(audioData) {
    if (!this.initialized) {
      throw new Error('Serwis STT nie został zainicjalizowany');
    }

    try {
      log.info('Transkrypcja danych audio...');
      
      // Dekodowanie danych audio z base64
      const buffer = Buffer.from(audioData, 'base64');
      
      // Sprawdź, czy dane audio zawierają metadane z transkrypcją
      // (Klient może dołączyć transkrypcję z Web Speech API)
      let transcribedText = '';
      
      try {
        // Sprawdź, czy dane są w formacie JSON z transkrypcją
        const jsonData = JSON.parse(buffer.toString());
        if (jsonData && jsonData.transcript) {
          transcribedText = jsonData.transcript;
          log.info(`Otrzymano transkrypcję z Web Speech API: "${transcribedText}"`);
          return transcribedText;
        }
      } catch (e) {
        // Jeśli nie jest to JSON, to prawdopodobnie są to czyste dane audio
        log.info('Dane nie są w formacie JSON, zakładamy że to czyste audio');
      }
      
      // Jeśli nie mamy transkrypcji z Web Speech API, zwróć informację
      // że transkrypcja powinna być wykonana przez przeglądarkę
      log.info('Brak transkrypcji w danych, wysyłanie prośby o użycie Web Speech API');
      return {
        type: 'web-stt-request',
        message: 'Proszę użyć Web Speech API w przeglądarce do transkrypcji'
      };
    } catch (error) {
      log.error('Błąd transkrypcji mowy:', error);
      throw error;
    }
  }
}

module.exports = STTService;