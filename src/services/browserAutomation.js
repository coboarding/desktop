/**
 * Browser Automation Service
 * Provides functionality for automated browser testing using Playwright
 */

const { chromium } = require('playwright');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

class BrowserAutomationService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isRunning = false;
    this.screenshotDir = options.screenshotDir || path.join(process.cwd(), 'screenshots');
    this.headless = options.headless !== false; // Domyślnie headless = true
    this.viewportSize = options.viewportSize || { width: 1280, height: 720 };
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.recordVideo = options.recordVideo || false;
    this.videoDir = options.videoDir || path.join(process.cwd(), 'videos');
    this.currentUrl = '';
  }

  /**
   * Inicjalizacja usługi automatyzacji przeglądarki
   * @returns {Promise<boolean>} - Promise zwracający true jeśli inicjalizacja się powiodła
   */
  async initialize() {
    try {
      log.info('Inicjalizacja usługi automatyzacji przeglądarki...');
      
      // Upewnij się, że katalogi istnieją
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true });
      }
      
      if (this.recordVideo && !fs.existsSync(this.videoDir)) {
        fs.mkdirSync(this.videoDir, { recursive: true });
      }
      
      log.info('Usługa automatyzacji przeglądarki zainicjalizowana pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji usługi automatyzacji przeglądarki:', error);
      return false;
    }
  }

  /**
   * Uruchomienie przeglądarki
   * @returns {Promise<boolean>} - Promise zwracający true jeśli uruchomienie się powiodło
   */
  async startBrowser() {
    if (this.isRunning) {
      log.info('Przeglądarka już uruchomiona');
      return true;
    }
    
    try {
      log.info('Uruchamianie przeglądarki...');
      
      // Opcje kontekstu przeglądarki
      const contextOptions = {
        viewport: this.viewportSize,
        userAgent: this.userAgent,
      };
      
      // Dodaj nagrywanie wideo, jeśli włączone
      if (this.recordVideo) {
        contextOptions.recordVideo = {
          dir: this.videoDir,
          size: this.viewportSize
        };
      }
      
      // Uruchom przeglądarkę
      this.browser = await chromium.launch({
        headless: this.headless
      });
      
      // Utwórz kontekst przeglądarki
      this.context = await this.browser.newContext(contextOptions);
      
      // Utwórz stronę
      this.page = await this.context.newPage();
      
      // Nasłuchuj zdarzeń nawigacji
      this.page.on('load', () => {
        this.currentUrl = this.page.url();
        this.emit('navigation', { url: this.currentUrl });
        log.info(`Załadowano stronę: ${this.currentUrl}`);
      });
      
      // Nasłuchuj błędów konsoli
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          log.error(`Błąd konsoli przeglądarki: ${msg.text()}`);
          this.emit('console-error', { message: msg.text() });
        }
      });
      
      // Nasłuchuj dialogów (alerty, potwierdzenia, itp.)
      this.page.on('dialog', async dialog => {
        log.info(`Dialog przeglądarki: ${dialog.type()}, ${dialog.message()}`);
        this.emit('dialog', { type: dialog.type(), message: dialog.message() });
        await dialog.accept(); // Domyślnie akceptuj wszystkie dialogi
      });
      
      this.isRunning = true;
      log.info('Przeglądarka uruchomiona pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd uruchamiania przeglądarki:', error);
      return false;
    }
  }

  /**
   * Zatrzymanie przeglądarki
   * @returns {Promise<boolean>} - Promise zwracający true jeśli zatrzymanie się powiodło
   */
  async stopBrowser() {
    if (!this.isRunning) {
      log.info('Przeglądarka nie jest uruchomiona');
      return true;
    }
    
    try {
      log.info('Zatrzymywanie przeglądarki...');
      
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.isRunning = false;
      log.info('Przeglądarka zatrzymana pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd zatrzymywania przeglądarki:', error);
      return false;
    }
  }

  /**
   * Przejście do podanego URL
   * @param {string} url - URL strony do odwiedzenia
   * @returns {Promise<boolean>} - Promise zwracający true jeśli nawigacja się powiodła
   */
  async navigateTo(url) {
    if (!this.isRunning) {
      log.warn('Przeglądarka nie jest uruchomiona. Uruchamianie...');
      const started = await this.startBrowser();
      if (!started) {
        return false;
      }
    }
    
    try {
      log.info(`Przechodzenie do URL: ${url}`);
      
      // Dodaj protokół, jeśli nie został podany
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // Przejdź do URL
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      
      this.currentUrl = this.page.url();
      log.info(`Przejście do URL zakończone: ${this.currentUrl}`);
      return true;
    } catch (error) {
      log.error(`Błąd przejścia do URL ${url}:`, error);
      return false;
    }
  }

  /**
   * Wykonanie zrzutu ekranu
   * @param {string} [name] - Opcjonalna nazwa pliku (bez rozszerzenia)
   * @returns {Promise<string|null>} - Promise zwracający ścieżkę do zrzutu ekranu lub null w przypadku błędu
   */
  async takeScreenshot(name) {
    if (!this.isRunning || !this.page) {
      log.warn('Przeglądarka nie jest uruchomiona. Nie można wykonać zrzutu ekranu.');
      return null;
    }
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = name ? `${name}-${timestamp}.png` : `screenshot-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      log.info(`Wykonywanie zrzutu ekranu: ${filepath}`);
      await this.page.screenshot({ path: filepath, fullPage: true });
      
      log.info(`Zrzut ekranu zapisany: ${filepath}`);
      return filepath;
    } catch (error) {
      log.error('Błąd wykonywania zrzutu ekranu:', error);
      return null;
    }
  }

  /**
   * Wypełnienie formularza
   * @param {Object} formData - Dane formularza w formacie {selektor: wartość}
   * @returns {Promise<boolean>} - Promise zwracający true jeśli wypełnianie się powiodło
   */
  async fillForm(formData) {
    if (!this.isRunning || !this.page) {
      log.warn('Przeglądarka nie jest uruchomiona. Nie można wypełnić formularza.');
      return false;
    }
    
    try {
      log.info('Wypełnianie formularza...');
      
      for (const [selector, value] of Object.entries(formData)) {
        log.info(`Wypełnianie pola ${selector} wartością: ${value}`);
        
        // Sprawdź, czy element istnieje
        const elementExists = await this.page.$(selector) !== null;
        if (!elementExists) {
          log.warn(`Element ${selector} nie istnieje na stronie`);
          continue;
        }
        
        // Wyczyść pole przed wypełnieniem
        await this.page.click(selector);
        await this.page.fill(selector, value);
      }
      
      log.info('Formularz wypełniony pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd wypełniania formularza:', error);
      return false;
    }
  }

  /**
   * Kliknięcie elementu na stronie
   * @param {string} selector - Selektor CSS elementu do kliknięcia
   * @returns {Promise<boolean>} - Promise zwracający true jeśli kliknięcie się powiodło
   */
  async clickElement(selector) {
    if (!this.isRunning || !this.page) {
      log.warn('Przeglądarka nie jest uruchomiona. Nie można kliknąć elementu.');
      return false;
    }
    
    try {
      log.info(`Klikanie elementu: ${selector}`);
      
      // Sprawdź, czy element istnieje
      const elementExists = await this.page.$(selector) !== null;
      if (!elementExists) {
        log.warn(`Element ${selector} nie istnieje na stronie`);
        return false;
      }
      
      // Kliknij element
      await this.page.click(selector);
      
      log.info(`Element ${selector} kliknięty pomyślnie`);
      return true;
    } catch (error) {
      log.error(`Błąd klikania elementu ${selector}:`, error);
      return false;
    }
  }

  /**
   * Wykonanie skryptu JavaScript na stronie
   * @param {string} script - Skrypt JavaScript do wykonania
   * @returns {Promise<any>} - Promise zwracający wynik wykonania skryptu
   */
  async executeScript(script) {
    if (!this.isRunning || !this.page) {
      log.warn('Przeglądarka nie jest uruchomiona. Nie można wykonać skryptu.');
      return null;
    }
    
    try {
      log.info('Wykonywanie skryptu JavaScript...');
      const result = await this.page.evaluate(script);
      log.info('Skrypt JavaScript wykonany pomyślnie');
      return result;
    } catch (error) {
      log.error('Błąd wykonywania skryptu JavaScript:', error);
      return null;
    }
  }

  /**
   * Pobranie zawartości HTML strony
   * @returns {Promise<string|null>} - Promise zwracający zawartość HTML strony lub null w przypadku błędu
   */
  async getPageContent() {
    if (!this.isRunning || !this.page) {
      log.warn('Przeglądarka nie jest uruchomiona. Nie można pobrać zawartości strony.');
      return null;
    }
    
    try {
      log.info('Pobieranie zawartości HTML strony...');
      const content = await this.page.content();
      log.info('Zawartość HTML strony pobrana pomyślnie');
      return content;
    } catch (error) {
      log.error('Błąd pobierania zawartości HTML strony:', error);
      return null;
    }
  }

  /**
   * Oczekiwanie na załadowanie elementu na stronie
   * @param {string} selector - Selektor CSS elementu do oczekiwania
   * @param {number} [timeout=30000] - Maksymalny czas oczekiwania w milisekundach
   * @returns {Promise<boolean>} - Promise zwracający true jeśli element został załadowany
   */
  async waitForElement(selector, timeout = 30000) {
    if (!this.isRunning || !this.page) {
      log.warn('Przeglądarka nie jest uruchomiona. Nie można oczekiwać na element.');
      return false;
    }
    
    try {
      log.info(`Oczekiwanie na element: ${selector} (timeout: ${timeout}ms)`);
      await this.page.waitForSelector(selector, { timeout });
      log.info(`Element ${selector} załadowany pomyślnie`);
      return true;
    } catch (error) {
      log.error(`Błąd oczekiwania na element ${selector}:`, error);
      return false;
    }
  }

  /**
   * Wykonanie testu automatycznego na podstawie scenariusza
   * @param {Object} scenario - Scenariusz testu
   * @returns {Promise<Object>} - Promise zwracający wynik testu
   */
  async runTestScenario(scenario) {
    if (!scenario || !Array.isArray(scenario.steps)) {
      log.error('Nieprawidłowy format scenariusza testu');
      return { success: false, error: 'Nieprawidłowy format scenariusza testu' };
    }
    
    try {
      log.info(`Uruchamianie scenariusza testu: ${scenario.name || 'Bez nazwy'}`);
      
      // Uruchom przeglądarkę, jeśli nie jest uruchomiona
      if (!this.isRunning) {
        await this.startBrowser();
      }
      
      const results = [];
      
      // Wykonaj kroki scenariusza
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        log.info(`Wykonywanie kroku ${i + 1}: ${step.action}`);
        
        let stepResult = { action: step.action, success: false };
        
        switch (step.action) {
          case 'navigate':
            stepResult.success = await this.navigateTo(step.url);
            break;
            
          case 'click':
            stepResult.success = await this.clickElement(step.selector);
            break;
            
          case 'fill':
            stepResult.success = await this.fillForm({ [step.selector]: step.value });
            break;
            
          case 'wait':
            if (step.selector) {
              stepResult.success = await this.waitForElement(step.selector, step.timeout);
            } else {
              await new Promise(resolve => setTimeout(resolve, step.timeout || 1000));
              stepResult.success = true;
            }
            break;
            
          case 'screenshot':
            const screenshotPath = await this.takeScreenshot(step.name);
            stepResult.success = !!screenshotPath;
            stepResult.path = screenshotPath;
            break;
            
          case 'execute':
            const scriptResult = await this.executeScript(step.script);
            stepResult.success = true;
            stepResult.result = scriptResult;
            break;
            
          default:
            log.warn(`Nieznana akcja: ${step.action}`);
            stepResult.success = false;
            stepResult.error = `Nieznana akcja: ${step.action}`;
        }
        
        results.push(stepResult);
        
        // Jeśli krok nie powiódł się i scenariusz wymaga zatrzymania przy błędzie, przerwij
        if (!stepResult.success && scenario.stopOnError) {
          log.warn(`Krok ${i + 1} nie powiódł się. Przerywanie scenariusza.`);
          break;
        }
      }
      
      // Wykonaj zrzut ekranu na koniec testu, jeśli wymagane
      if (scenario.screenshotOnComplete) {
        const finalScreenshot = await this.takeScreenshot(`${scenario.name || 'test'}-final`);
        results.push({
          action: 'final-screenshot',
          success: !!finalScreenshot,
          path: finalScreenshot
        });
      }
      
      // Zamknij przeglądarkę, jeśli wymagane
      if (scenario.closeBrowserAfter) {
        await this.stopBrowser();
      }
      
      const success = results.every(result => result.success);
      log.info(`Scenariusz testu zakończony ${success ? 'pomyślnie' : 'z błędami'}`);
      
      return {
        success,
        results,
        url: this.currentUrl
      };
    } catch (error) {
      log.error('Błąd wykonywania scenariusza testu:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = BrowserAutomationService;