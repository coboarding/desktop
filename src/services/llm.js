const ort = require('onnxruntime-node');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

class LLMService {
  constructor(options) {
    this.modelPath = options.modelPath;
    this.session = null;
    this.initialized = false;
    this.modelType = null;
  }

  async initialize() {
    try {
      log.info(`Inicjalizacja modelu LLM: ${this.modelPath}`);

      // Sprawdź, czy plik modelu istnieje
      if (fs.existsSync(this.modelPath)) {
        try {
          // Sprawdź format modelu
          const firstBytes = fs.readFileSync(this.modelPath, { start: 0, end: 4 });
          const magicBytes = firstBytes.toString('hex');

          if (magicBytes === "00000000" || magicBytes.includes("json")) {
            // JSON lub inny format tekstowy - sprawdź czy to plik JSON
            try {
              const fileContent = fs.readFileSync(this.modelPath, 'utf-8');
              const jsonData = JSON.parse(fileContent);
              this.modelType = jsonData.model_type || "unknown";
              log.info(`Wykryto model typu: ${this.modelType}`);
            } catch (jsonError) {
              log.warn('Nie udało się sparsować JSON z pliku modelu');
              this.modelType = "unknown";
            }
          } else {
            // Próba wczytania modelu ONNX
            try {
              this.session = await ort.InferenceSession.create(this.modelPath);
              this.modelType = "onnx";
              log.info('Model ONNX załadowany pomyślnie');
            } catch (onnxError) {
              log.warn('Nie udało się załadować modelu jako ONNX:', onnxError);
              this.modelType = "binary";
            }
          }
        } catch (formatError) {
          log.warn('Błąd podczas identyfikacji formatu modelu:', formatError);
          this.modelType = "unknown";
        }
      } else {
        log.warn(`Model LLM nie znaleziony: ${this.modelPath}`);
        log.info('Używanie symulowanego modelu LLM');
        this.modelType = "simulated";
      }

      this.initialized = true;
      log.info(`Model LLM (typ: ${this.modelType}) zainicjalizowany pomyślnie`);
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji modelu LLM:', error);
      throw error;
    }
  }

  async process(text) {
    if (!this.initialized) {
      throw new Error('Model LLM nie został zainicjalizowany');
    }

    try {
      log.info(`Przetwarzanie tekstu przez LLM (${this.modelType}): ${text}`);

      // Próba użycia modelu ONNX jeśli załadowany
      if (this.modelType === "onnx" && this.session) {
        try {
          // W rzeczywistej implementacji użylibyśmy tu tokenizacji i przetwarzania przez model
          // Przykładowa implementacja (uproszczona):

          // 1. Symulacja tokenizacji (w rzeczywistości użylibyśmy tokenizera)
          const tokens = text.split(/\s+/).map(t => t.toLowerCase());

          // 2. Symulacja tensora wejściowego
          const inputTensor = new ort.Tensor('int64', new BigInt64Array(tokens.length), [1, tokens.length]);

          // 3. Uruchomienie inferencji (w rzeczywistości przekazalibyśmy właściwe inputy)
          // const results = await this.session.run({ input_ids: inputTensor });

          // 4. Dekodowanie wyniku (symulacja)
          return `[Model ONNX] Rozumiem twoje pytanie: "${text}". Jak mogę Ci pomóc z tym?`;
        } catch (onnxError) {
          log.warn('Błąd podczas przetwarzania przez model ONNX:', onnxError);
          // Fallback do symulacji
        }
      }

      // Symulacja odpowiedzi dla różnych typów modeli
      let prefix = "";
      if (this.modelType === "onnx") {
        prefix = "[Model ONNX] ";
      } else if (this.modelType === "binary") {
        prefix = "[Model binarny] ";
      } else if (this.modelType === "tinyllama" || this.modelType === "tiny_llm") {
        prefix = "[TinyLLM] ";
      } else {
        prefix = "[Model symulowany] ";
      }

      // Symulacja odpowiedzi na podstawie rozpoznanych wzorców
      const lowerText = text.toLowerCase();

      // Sprawdź, czy tekst zawiera któryś z kluczy
      const responses = {
        'cześć': `${prefix}Witaj! Jak mogę Ci pomóc?`,
        'hej': `${prefix}Hej! Miło Cię słyszeć. Jak się masz?`,
        'jak się masz': `${prefix}Dziękuję, mam się dobrze. Jestem gotowy, aby Ci pomóc!`,
        'do widzenia': `${prefix}Do widzenia! Miło było rozmawiać.`,
        'kim jesteś': `${prefix}Jestem asystentem AI w aplikacji VideoChat, działający na małym modelu LLM. Zostałem zaprojektowany, aby prowadzić z Tobą rozmowy głosowe i pokazywać fajną animację ASCII.`,
        'co potrafisz': `${prefix}Potrafię prowadzić rozmowy głosowe, odpowiadać na pytania i pokazywać zabawne animacje ASCII. Pracuję na małym modelu językowym, ale staram się być pomocny!`
      };

      for (const [pattern, answer] of Object.entries(responses)) {
        if (lowerText.includes(pattern)) {
          return answer;
        }
      }

      // Jeśli pytanie o pogodę
      if (lowerText.includes('pogoda') || lowerText.includes('deszcz') || lowerText.includes('słońce')) {
        return `${prefix}Niestety nie mam dostępu do aktualnych danych o pogodzie, ale moja animacja ASCII zawsze świeci!`;
      }

      // Jeśli pytanie o czas
      if (lowerText.includes('godzina') || lowerText.includes('czas')) {
        const now = new Date();
        return `${prefix}Aktualny czas to ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}.`;
      }

      // Jeśli pytanie o datę
      if (lowerText.includes('data') || lowerText.includes('dzień')) {
        const now = new Date();
        return `${prefix}Dzisiaj jest ${now.getDate()} ${['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'][now.getMonth()]} ${now.getFullYear()} roku.`;
      }

      // Jeśli pytanie o animację
      if (lowerText.includes('animacja') || lowerText.includes('ascii')) {
        return `${prefix}Moja animacja ASCII to prosty, ale uroczy sposób na wizualizację moich stanów. Mam różne wyrazy twarzy dla słuchania, mówienia i myślenia!`;
      }

      // Domyślna odpowiedź
      return `${prefix}Rozumiem. Czy mogę ci jeszcze w czymś pomóc?`;
    } catch (error) {
      log.error('Błąd przetwarzania tekstu przez LLM:', error);
      throw error;
    }
  }
}

module.exports = LLMService;