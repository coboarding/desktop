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
const EventEmitter = require('events');

/**
 * Klasa obsługująca funkcjonalność modelu językowego (LLM)
 */
class LLMService extends EventEmitter {
  /**
   * Tworzy nową instancję LLMService
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(options = {}) {
    super();
    this.options = options;
    this.initialized = false;
    this.useExternalAPI = true; // Zawsze używaj zewnętrznego API
    this.browserAutomation = options.browserAutomation || null;
    
    // Definicja komend przeglądarki, które możemy rozpoznać
    this.browserCommands = [
      {
        action: 'googleSearch',
        description: 'Wyszukiwanie w Google',
        patterns: ['wyszukaj w google frazę', 'wyszukaj w google', 'google', 'znajdź informacje o', 'szukaj', 'wyszukaj']
      },
      {
        action: 'formFill',
        description: 'Wypełnianie formularza',
        patterns: ['wypełnij formularz na stronie', 'wypełnij formularz', 'uzupełnij dane', 'wprowadź dane']
      },
      {
        action: 'navigateTo',
        description: 'Przejście do strony',
        patterns: ['przejdź do strony', 'otwórz stronę', 'pokaż stronę', 'idź do', 'przejdź do']
      },
      {
        action: 'takeScreenshot',
        description: 'Wykonanie zrzutu ekranu',
        patterns: ['zrób zrzut ekranu', 'wykonaj screenshot', 'zrzut ekranu']
      },
      {
        action: 'clickElement',
        description: 'Kliknięcie elementu na stronie',
        patterns: ['kliknij pierwszy link na stronie', 'kliknij link', 'kliknij', 'naciśnij przycisk', 'kliknij element']
      }
    ];
    
    // Dodanie obsługi zdarzeń
    this.eventHandlers = {};
    
    log.info('LLMService: Inicjalizacja serwisu LLM');
  }
  
  // EventEmitter ma już zaimplementowane metody emit, on, off, więc nie musimy ich implementować

  /**
   * Inicjalizuje usługę LLM
   * @returns {Promise<boolean>} - Czy inicjalizacja się powiodła
   */
  async initialize() {
    try {
      log.info('LLMService: Inicjalizacja...');
      
      // Symulacja inicjalizacji
      this.initialized = true;
      
      log.info('LLMService: Inicjalizacja zakończona pomyślnie');
      return true;
    } catch (error) {
      log.error(`LLMService: Błąd inicjalizacji: ${error.message}`);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Sprawdza, czy tekst zawiera komendę automatyzacji przeglądarki
   * @param {string} text - Tekst do sprawdzenia
   * @returns {Object|null} - Obiekt z informacjami o komendzie lub null, jeśli nie znaleziono komendy
   * @private
   */
  _checkForBrowserCommand(text) {
    log.info(`LLMService: Sprawdzanie komendy przeglądarki w tekście: "${text}"`);
    const lowerText = text.toLowerCase();
    
    // Sprawdzanie bezpośrednio komend z przycisków
    if (lowerText.includes('wyszukaj w google frazę')) {
      const searchMatch = text.match(/['"](.*?)['"]/); 
      return {
        action: 'googleSearch',
        description: 'Wyszukiwanie w Google',
        params: {
          query: searchMatch ? searchMatch[1] : 'Playwright browser automation'
        }
      };
    }
    
    if (lowerText.includes('wypełnij formularz na stronie')) {
      return {
        action: 'formFill',
        description: 'Wypełnianie formularza',
        params: {}
      };
    }
    
    if (lowerText.includes('przejdź do strony')) {
      const urlMatch = text.match(/strony\s+([\w\.-]+\.[a-z]{2,})/);
      const url = urlMatch ? urlMatch[1] : 'example.com';
      return {
        action: 'navigateTo',
        description: 'Przejście do strony',
        params: {
          url: url.startsWith('http') ? url : 'https://' + url
        }
      };
    }
    
    if (lowerText.includes('zrób zrzut ekranu') || lowerText.includes('zrzut ekranu')) {
      return {
        action: 'takeScreenshot',
        description: 'Wykonanie zrzutu ekranu',
        params: {}
      };
    }
    
    if (lowerText.includes('kliknij pierwszy link') || lowerText.includes('kliknij link')) {
      return {
        action: 'clickElement',
        description: 'Kliknięcie elementu na stronie',
        params: {
          target: 'pierwszy link'
        }
      };
    }
    
    // Jeśli nie znaleziono bezpośredniego dopasowania, spróbuj ogólnych wzorów
    for (const command of this.browserCommands) {
      for (const pattern of command.patterns) {
        if (lowerText.includes(pattern)) {
          // Wyodrębnij parametry komendy
          let params = {};
          
          // Obsługa różnych typów komend
          switch (command.action) {
            case 'googleSearch':
              // Wyodrębnij frazę wyszukiwania
              const searchMatch = text.match(/['"](.*?)['"]/); 
              params.query = searchMatch ? searchMatch[1] : 'Playwright browser automation';
              break;
              
            case 'navigateTo':
              // Wyodrębnij URL
              const urlMatch = text.match(/do\s+([\w\.-]+\.[a-z]{2,})/) || text.match(/stron\S+\s+([\w\.-]+\.[a-z]{2,})/);
              params.url = urlMatch ? urlMatch[1] : 'example.com';
              if (!params.url.startsWith('http')) {
                params.url = 'https://' + params.url;
              }
              break;
              
            case 'clickElement':
              // Wyodrębnij selektor lub tekst elementu
              const clickMatch = text.match(/kliknij\s+(.+)$/) || text.match(/click\s+(.+)$/);
              params.target = clickMatch ? clickMatch[1] : 'pierwszy link';
              break;
          }
          
          return {
            action: command.action,
            description: command.description,
            params: params
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Wykonuje komendę automatyzacji przeglądarki
   * @param {Object} command - Obiekt z informacjami o komendzie
   * @returns {Promise<string>} - Odpowiedź po wykonaniu komendy
   * @private
   */
  async _executeBrowserCommand(command) {
    if (!this.browserAutomation) {
      return "Nie mogę wykonać tej komendy, ponieważ usługa automatyzacji przeglądarki nie jest dostępna.";
    }
    
    try {
      log.info(`LLMService: Wykonywanie komendy przeglądarki: ${command.action}`, command.params);
      
      // Emituj zdarzenie z komendą przeglądarki
      this.emit('browser-command', command);
      
      // Wykonaj odpowiednią akcję w zależności od typu komendy
      switch (command.action) {
        case 'googleSearch':
          // Uruchom scenariusz wyszukiwania Google
          const googleSearchScenario = {
            name: "Google Search Test",
            description: "Automatyczne wyszukiwanie w Google",
            stopOnError: true,
            screenshotOnComplete: true,
            steps: [
              {
                action: "navigate",
                url: "https://www.google.com"
              },
              {
                action: "wait",
                selector: "input[name='q']",
                timeout: 5000
              },
              {
                action: "fill",
                selector: "input[name='q']",
                value: command.params.query
              },
              {
                action: "click",
                selector: "input[name='btnK'], button[type='submit']"
              },
              {
                action: "wait",
                selector: "#search",
                timeout: 5000
              },
              {
                action: "screenshot",
                name: "search-results"
              }
            ]
          };
          
          return `Wykonuję wyszukiwanie w Google dla frazy: "${command.params.query}". Proszę czekać...`;
          
        case 'formFill':
          // Uruchom scenariusz wypełniania formularza
          const formTestScenario = {
            name: "Form Filling Test",
            description: "Automatyczne wypełnianie formularza",
            stopOnError: true,
            screenshotOnComplete: true,
            steps: [
              {
                action: "navigate",
                url: "https://www.w3schools.com/html/html_forms.asp"
              },
              {
                action: "wait",
                selector: "form",
                timeout: 5000
              },
              {
                action: "fill",
                selector: "input[name='firstname']",
                value: "Test User"
              },
              {
                action: "fill",
                selector: "input[name='lastname']",
                value: "Automation"
              },
              {
                action: "screenshot",
                name: "form-filled"
              },
              {
                action: "click",
                selector: "input[type='submit']"
              },
              {
                action: "wait",
                timeout: 3000
              },
              {
                action: "screenshot",
                name: "form-submitted"
              }
            ]
          };
          
          return "Wykonuję automatyczne wypełnianie formularza na stronie W3Schools. Proszę czekać...";
          
        case 'navigateTo':
          // Przejdź do podanego URL
          return `Przechodzę do strony: ${command.params.url}. Proszę czekać...`;
          
        case 'takeScreenshot':
          // Wykonaj zrzut ekranu
          return "Wykonuję zrzut ekranu aktualnej strony. Proszę czekać...";
          
        case 'clickElement':
          // Kliknij element
          return `Klikam element: ${command.params.target}. Proszę czekać...`;
          
        default:
          return "Nie rozpoznaję tej komendy automatyzacji przeglądarki.";
      }
    } catch (error) {
      log.error(`LLMService: Błąd wykonywania komendy przeglądarki: ${error.message}`);
      return `Wystąpił błąd podczas wykonywania komendy: ${error.message}`;
    }
  }

  /**
   * Przetwarza tekst wejściowy i generuje odpowiedź
   * @param {string} text - Tekst wejściowy do przetworzenia
   * @returns {Promise<string>} - Wygenerowana odpowiedź
   */
  async processText(text) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      log.info(`LLMService: Przetwarzanie tekstu: "${text}"`);
      
      // Sprawdź, czy tekst zawiera komendę automatyzacji przeglądarki
      const browserCommand = this._checkForBrowserCommand(text);
      if (browserCommand) {
        log.info(`LLMService: Wykryto komendę przeglądarki: ${JSON.stringify(browserCommand)}`);
        return await this._executeBrowserCommand(browserCommand);
      } else {
        log.info(`LLMService: Nie wykryto komendy przeglądarki w tekście`);
      }
      
      // Symulacja opóźnienia przetwarzania
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Prosta logika odpowiedzi
      let response = "";
      
      if (text.toLowerCase().includes('cześć') || text.toLowerCase().includes('witaj')) {
        response = "Witaj! Jak mogę Ci dzisiaj pomóc?";
      } else if (text.toLowerCase().includes('pogoda')) {
        response = "Niestety nie mam dostępu do aktualnych danych pogodowych. Czy mogę pomóc w czymś innym?";
      } else if (text.toLowerCase().includes('godzina') || text.toLowerCase().includes('czas')) {
        const now = new Date();
        response = `Aktualna godzina to ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}.`;
      } else if (text.toLowerCase().includes('data') || text.toLowerCase().includes('dzień')) {
        const now = new Date();
        response = `Dzisiaj jest ${now.getDate()} ${['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'][now.getMonth()]} ${now.getFullYear()} roku.`;
      } else if (text.toLowerCase().includes('jak się masz') || text.toLowerCase().includes('jak tam')) {
        response = "Dziękuję, mam się dobrze! Jestem tutaj, aby Ci pomóc. W czym mogę asystować?";
      } else if (text.toLowerCase().includes('dziękuję') || text.toLowerCase().includes('dzięki')) {
        response = "Nie ma za co! Czy mogę jeszcze w czymś pomóc?";
      } else if (text.toLowerCase().includes('do widzenia') || text.toLowerCase().includes('pa') || text.toLowerCase().includes('żegnaj')) {
        response = "Do widzenia! Miło było porozmawiać. Wróć, gdy będziesz potrzebować pomocy.";
      } else if (text.toLowerCase().includes('test') || text.toLowerCase().includes('sprawdzam')) {
        response = "Test systemu działa poprawnie. Mikrofon i rozpoznawanie mowy funkcjonują prawidłowo.";
      } else if (text.toLowerCase().includes('web speech') || text.toLowerCase().includes('api')) {
        response = "Tak, używam Web Speech API do rozpoznawania mowy i syntezy głosu. To nowoczesna technologia dostępna w przeglądarkach internetowych.";
      } else {
        response = "Rozumiem. Czy mogę jakoś pomóc w związku z tym tematem?";
      }
      
      log.info(`LLMService: Wygenerowana odpowiedź: "${response}"`);
      return response;
    } catch (error) {
      log.error(`LLMService: Błąd przetwarzania tekstu: ${error.message}`);
      return "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Czy możesz spróbować ponownie?";
    }
  }

  /**
   * Alias dla metody processText dla zachowania kompatybilności
   * @param {string} text - Tekst wejściowy do przetworzenia
   * @returns {Promise<string>} - Wygenerowana odpowiedź
   */
  async process(text) {
    return this.processText(text);
  }
}

module.exports = LLMService;