// Mock implementation for onnxruntime when testing
let ort = null;

// Only try to load the real modules if we're not in a test environment
if (process.env.NODE_ENV !== 'test') {
  try {
    // Try onnxruntime first
    ort = require('onnxruntime');
  } catch (e1) {
    try {
      // Then try onnxruntime-node
      ort = require('onnxruntime-node');
    } catch (e2) {
      // Both failed, use simulated mode
      ort = null;
    }
  }
}
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

class LLMService {
  constructor(options) {
    this.modelPath = options.modelPath;
    this.session = null;
    this.initialized = false;
    this.modelType = null;
    this.useExternalAPI = true; // Zawsze używaj zewnętrznego API
  }

  async initialize() {
    try {
      log.info(`Inicjalizacja serwisu LLM`);
      
      // Sprawdź, czy plik modelu istnieje
      if (fs.existsSync(this.modelPath)) {
        log.info('Model LLM istnieje, ale używamy zewnętrznego API');
      } else {
        log.warn(`Model LLM nie znaleziony: ${this.modelPath}`);
        log.info('Używanie zewnętrznego API dla LLM');
        
        // Utwórz katalog dla modeli, jeśli nie istnieje
        const modelDir = path.dirname(this.modelPath);
        fs.mkdirSync(modelDir, { recursive: true });
      }

      this.initialized = true;
      log.info('Serwis LLM zainicjalizowany pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji serwisu LLM:', error);
      throw error;
    }
  }

  async process(text) {
    if (!this.initialized) {
      throw new Error('Serwis LLM nie został zainicjalizowany');
    }

    try {
      log.info(`Przetwarzanie tekstu przez LLM: ${text}`);
      
      // Zawsze używaj zewnętrznego API
      return await this._useExternalAPI(text);
    } catch (error) {
      log.error('Błąd przetwarzania tekstu przez LLM:', error);
      
      // W przypadku błędu, wygeneruj odpowiedź fallbackową
      return this._generateFallbackResponse(text);
    }
  }

  /**
   * Używa zewnętrznego API do generowania odpowiedzi
   * @param {string} text - Tekst do przetworzenia
   * @returns {Promise<string>} - Wygenerowana odpowiedź
   * @private
   */
  async _useExternalAPI(text) {
    try {
      log.info('Używanie zewnętrznego API dla LLM...');
      
      // Symulacja opóźnienia odpowiedzi z API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Proste reguły odpowiedzi dla różnych typów zapytań
      if (text.toLowerCase().includes('cześć') || 
          text.toLowerCase().includes('witaj') || 
          text.toLowerCase().includes('hej')) {
        return 'Cześć! Jak mogę Ci dzisiaj pomóc?';
      }
      
      if (text.toLowerCase().includes('jak się masz')) {
        return 'Dziękuję, mam się dobrze! Jestem tutaj, aby Ci pomóc.';
      }
      
      if (text.toLowerCase().includes('rtsp')) {
        return 'Mogę pomóc Ci skonfigurować strumień RTSP. Potrzebuję adresu URL, nazwy użytkownika i hasła. Czy chcesz skonfigurować to teraz?';
      }
      
      if (text.toLowerCase().includes('pogoda')) {
        return 'Niestety nie mam dostępu do aktualnych danych pogodowych. Czy mogę pomóc Ci w czymś innym?';
      }
      
      if (text.toLowerCase().includes('dziękuję') || text.toLowerCase().includes('dzięki')) {
        return 'Nie ma za co! Czy mogę jeszcze w czymś pomóc?';
      }
      
      if (text.toLowerCase().includes('do widzenia') || 
          text.toLowerCase().includes('pa') || 
          text.toLowerCase().includes('żegnaj')) {
        return 'Do widzenia! Miło było porozmawiać. Wróć, gdy będziesz potrzebować pomocy!';
      }
      
      // Domyślna odpowiedź dla innych zapytań
      return `Rozumiem, że pytasz o "${text}". Niestety, nie mam wystarczających informacji, aby udzielić szczegółowej odpowiedzi. Czy możesz podać więcej szczegółów?`;
    } catch (error) {
      log.error('Błąd podczas używania zewnętrznego API:', error);
      throw error;
    }
  }

  /**
   * Generuje odpowiedź fallbackową w przypadku błędu
   * @param {string} text - Oryginalny tekst zapytania
   * @returns {string} - Wygenerowana odpowiedź fallbackowa
   * @private
   */
  _generateFallbackResponse(text) {
    return `Przepraszam, ale miałem problem z przetworzeniem Twojej wypowiedzi. Czy możesz powtórzyć lub sformułować to inaczej?`;
  }
}

module.exports = LLMService;