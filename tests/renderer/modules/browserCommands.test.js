/**
 * Testy jednostkowe dla modułu browserCommands
 */

// Importuj funkcje do testowania
const { CommandTypes, checkForBrowserCommand } = require('../../../src/renderer/modules/browserCommands');

// Grupa testów dla funkcji checkForBrowserCommand
describe('checkForBrowserCommand', () => {
  // Test dla wyszukiwania w Google
  test('powinien rozpoznać komendę wyszukiwania w Google', () => {
    const text = 'Wyszukaj w Google frazę "Playwright browser automation"';
    const result = checkForBrowserCommand(text);
    
    expect(result).not.toBeNull();
    expect(result.action).toBe(CommandTypes.GOOGLE_SEARCH);
    expect(result.params.query).toBe('Playwright browser automation');
  });
  
  // Test dla wypełniania formularza
  test('powinien rozpoznać komendę wypełniania formularza', () => {
    const text = 'Wypełnij formularz na stronie W3Schools';
    const result = checkForBrowserCommand(text);
    
    expect(result).not.toBeNull();
    expect(result.action).toBe(CommandTypes.FORM_FILL);
  });
  
  // Test dla przejścia do strony
  test('powinien rozpoznać komendę przejścia do strony', () => {
    const text = 'Przejdź do strony example.com';
    const result = checkForBrowserCommand(text);
    
    expect(result).not.toBeNull();
    expect(result.action).toBe(CommandTypes.NAVIGATE);
    expect(result.params.url).toBe('example.com');
  });
  
  // Test dla zrzutu ekranu
  test('powinien rozpoznać komendę zrzutu ekranu', () => {
    const text = 'Zrób zrzut ekranu';
    const result = checkForBrowserCommand(text);
    
    expect(result).not.toBeNull();
    expect(result.action).toBe(CommandTypes.TAKE_SCREENSHOT);
  });
  
  // Test dla kliknięcia linku
  test('powinien rozpoznać komendę kliknięcia linku', () => {
    const text = 'Kliknij pierwszy link na stronie';
    const result = checkForBrowserCommand(text);
    
    expect(result).not.toBeNull();
    expect(result.action).toBe(CommandTypes.CLICK_LINK);
    expect(result.params.index).toBe(0);
  });
  
  // Test dla kliknięcia linku z określoną pozycją
  test('powinien rozpoznać komendę kliknięcia linku z określoną pozycją', () => {
    const text = 'Kliknij trzeci link na stronie';
    const result = checkForBrowserCommand(text);
    
    expect(result).not.toBeNull();
    expect(result.action).toBe(CommandTypes.CLICK_LINK);
    expect(result.params.index).toBe(2);
  });
  
  // Test dla niepoprawnego tekstu
  test('powinien zwrócić null dla niepoprawnego tekstu', () => {
    const text = 'To nie jest komenda przeglądarki';
    const result = checkForBrowserCommand(text);
    
    expect(result).toBeNull();
  });
  
  // Test dla pustego tekstu
  test('powinien zwrócić null dla pustego tekstu', () => {
    const result = checkForBrowserCommand('');
    
    expect(result).toBeNull();
  });
  
  // Test dla null
  test('powinien zwrócić null dla null', () => {
    const result = checkForBrowserCommand(null);
    
    expect(result).toBeNull();
  });
});
