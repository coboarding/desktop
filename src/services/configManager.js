const fs = require('fs');
const path = require('path');
const log = require('electron-log');

// Konfiguracja infrastruktury aplikacji
class ConfigManager {
  constructor(options = {}) {
    this.configPath = options.configPath || path.join(process.cwd(), 'config.json');
    this.config = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      log.info(`Inicjalizacja menedżera konfiguracji: ${this.configPath}`);

      // Sprawdź, czy plik konfiguracyjny istnieje
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
      } else {
        // Utwórz domyślną konfigurację
        this.config = this.getDefaultConfig();

        // Zapisz domyślną konfigurację
        fs.writeFileSync(
          this.configPath,
          JSON.stringify(this.config, null, 2),
          'utf-8'
        );
      }

      this.initialized = true;
      log.info('Menedżer konfiguracji zainicjalizowany pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji menedżera konfiguracji:', error);
      return false;
    }
  }

  getDefaultConfig() {
    return {
      app: {
        name: "VideoChat LLM",
        version: "1.0.0",
        port: 3000,
        novnc_port: 6080
      },
      models: {
        llm: path.join(process.cwd(), 'models/llm/model.onnx'),
        tts: path.join(process.cwd(), 'models/tts/model.bin'),
        stt: path.join(process.cwd(), 'models/stt/model.bin')
      },
      infrastructure: {
        k3s_enabled: false,
        kubeconfig: path.join(process.cwd(), 'kubernetes/kubeconfig'),
        use_terraform: true
      },
      ui: {
        theme: "dark",
        animate_ascii: true,
        auto_start_conversation: true
      },
      audio: {
        input_device: "default",
        output_device: "default",
        volume: 80
      }
    };
  }

  get(key, defaultValue = null) {
    if (!this.initialized) {
      throw new Error('Menedżer konfiguracji nie został zainicjalizowany');
    }

    // Obsługa zagnieżdżonych kluczy (np. 'app.name')
    if (key.includes('.')) {
      const keys = key.split('.');
      let value = this.config;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue;
        }
      }

      return value;
    }

    return key in this.config ? this.config[key] : defaultValue;
  }

  set(key, value) {
    if (!this.initialized) {
      throw new Error('Menedżer konfiguracji nie został zainicjalizowany');
    }

    // Obsługa zagnieżdżonych kluczy (np. 'app.name')
    if (key.includes('.')) {
      const keys = key.split('.');
      let obj = this.config;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];

        if (!(k in obj)) {
          obj[k] = {};
        }

        obj = obj[k];
      }

      obj[keys[keys.length - 1]] = value;
    } else {
      this.config[key] = value;
    }

    // Zapisz zaktualizowaną konfigurację
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );

    return true;
  }

  getAll() {
    if (!this.initialized) {
      throw new Error('Menedżer konfiguracji nie został zainicjalizowany');
    }

    return this.config;
  }
}

module.exports = ConfigManager;