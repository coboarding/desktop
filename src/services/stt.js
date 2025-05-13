const path = require('path');
const log = require('electron-log');

/**
 * Klasa obsługująca funkcjonalność rozpoznawania mowy (Speech-to-Text)
 */
class STTService {
  /**
   * Tworzy nową instancję STTService
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    this.modelPath = options.modelPath || path.join(process.cwd(), 'models', 'stt');
    
    log.info(`STTService: Inicjalizacja z modelPath=${this.modelPath}`);
  }

  /**
   * Inicjalizuje usługę STT
   * @returns {Promise<boolean>} - Czy inicjalizacja się powiodła
   */
  async initialize() {
    try {
      // Sprawdź, czy używamy Web Speech API
      if (this.options.useWebSpeechAPI) {
        log.info('STTService: Używanie Web Speech API zamiast lokalnego modelu');
        this.initialized = true;
        return true;
      }

      // Próba inicjalizacji lokalnego modelu
      log.info('STTService: Próba inicjalizacji lokalnego modelu STT');
      
      // Symulacja inicjalizacji modelu (w rzeczywistej implementacji tutaj byłoby ładowanie modelu)
      this.initialized = false;
      
      // Zawsze zwracamy sukces, ponieważ będziemy używać Web Speech API jako fallback
      log.info('STTService: Inicjalizacja zakończona, używanie Web Speech API jako fallback');
      return true;
    } catch (error) {
      log.error(`STTService: Błąd inicjalizacji: ${error.message}`);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Transkrybuje dane audio na tekst
   * @param {Uint8Array} audioData - Dane audio do transkrypcji
   * @returns {Promise<string|Object>} - Transkrypcja lub obiekt z żądaniem użycia Web Speech API
   */
  async transcribe(audioData) {
    try {
      log.info('STTService: Próba transkrypcji audio');
      
      // Sprawdź, czy dane są w formacie JSON (mogą być już wynikiem z Web Speech API)
      try {
        const data = JSON.parse(Buffer.from(audioData).toString());
        
        // Jeśli to JSON z transkrypcją, zwróć tekst
        if (data && data.transcript) {
          log.info(`Otrzymano transkrypcję z Web Speech API: "${data.transcript}"`);
          return data.transcript;
        }
      } catch (e) {
        // To nie jest JSON, spróbuj użyć Web Speech API w przeglądarce
        log.info('Dane nie są w formacie JSON, używamy Web Speech API');
        return {
          type: 'web-stt-request',
          message: 'Proszę użyć Web Speech API w przeglądarce do transkrypcji'
        };
      }
      
      // Jeśli nie udało się przetworzyć danych, zwróć komunikat o błędzie
      return "Nie udało się rozpoznać mowy. Spróbuj ponownie.";
    } catch (error) {
      log.error(`STTService: Błąd transkrypcji: ${error.message}`);
      return {
        type: 'web-stt-request',
        message: 'Błąd transkrypcji, używamy Web Speech API jako fallback'
      };
    }
  }
}

module.exports = STTService;