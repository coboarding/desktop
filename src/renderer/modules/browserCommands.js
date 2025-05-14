/**
 * Moduł obsługujący komendy przeglądarki
 */

/**
 * Typy komend przeglądarki
 * @enum {string}
 */
const CommandTypes = {
  GOOGLE_SEARCH: 'googleSearch',
  FORM_FILL: 'formFill',
  NAVIGATE: 'navigate',
  TAKE_SCREENSHOT: 'takeScreenshot',
  CLICK_LINK: 'clickLink'
};

/**
 * Wzorce rozpoznawania komend przeglądarki
 */
const commandPatterns = [
  {
    pattern: /wyszukaj w google frazę ['"](.+?)['"]/i,
    action: CommandTypes.GOOGLE_SEARCH,
    description: 'Wyszukiwanie w Google',
    extractParams: (matches) => ({ query: matches[1] })
  },
  {
    pattern: /wypełnij formularz/i,
    action: CommandTypes.FORM_FILL,
    description: 'Wypełnianie formularza',
    extractParams: () => ({})
  },
  {
    pattern: /przejdź do strony (.+)/i,
    action: CommandTypes.NAVIGATE,
    description: 'Przejście do strony',
    extractParams: (matches) => ({ url: matches[1] })
  },
  {
    pattern: /zrób zrzut ekranu/i,
    action: CommandTypes.TAKE_SCREENSHOT,
    description: 'Wykonanie zrzutu ekranu',
    extractParams: () => ({})
  },
  {
    pattern: /kliknij (pierwszy|drugi|trzeci|czwarty|piąty)? ?link/i,
    action: CommandTypes.CLICK_LINK,
    description: 'Kliknięcie linku',
    extractParams: (matches) => {
      const position = matches[1] ? matches[1].toLowerCase() : 'pierwszy';
      const positionMap = {
        'pierwszy': 0,
        'drugi': 1,
        'trzeci': 2,
        'czwarty': 3,
        'piąty': 4
      };
      return { index: positionMap[position] || 0 };
    }
  }
];

/**
 * Sprawdza, czy tekst zawiera komendę przeglądarki
 * @param {string} text - Tekst do sprawdzenia
 * @returns {Object|null} - Obiekt komendy lub null, jeśli nie znaleziono
 */
function checkForBrowserCommand(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  // Sprawdzanie bezpośrednio komend z przycisków
  if (lowerText.includes('wyszukaj w google frazę')) {
    const searchMatch = text.match(/['"](.*?)['"]/); 
    return {
      action: CommandTypes.GOOGLE_SEARCH,
      description: 'Wyszukiwanie w Google',
      params: {
        query: searchMatch ? searchMatch[1] : 'Playwright browser automation'
      }
    };
  }
  
  if (lowerText.includes('wypełnij formularz na stronie')) {
    return {
      action: CommandTypes.FORM_FILL,
      description: 'Wypełnianie formularza',
      params: {}
    };
  }
  
  // Sprawdzanie wzorców
  for (const pattern of commandPatterns) {
    const matches = text.match(pattern.pattern);
    if (matches) {
      return {
        action: pattern.action,
        description: pattern.description,
        params: pattern.extractParams(matches)
      };
    }
  }
  
  return null;
}

/**
 * Wykonuje komendę przeglądarki
 * @param {Object} command - Obiekt komendy
 * @param {Object} socket - Obiekt socket.io
 */
function executeBrowserCommand(command, socket) {
  if (!command || !socket) return;
  
  console.log(`Wykonywanie komendy przeglądarki: ${command.action}`, command.params);
  
  // Wyślij komendę do serwera
  socket.emit('browser-command', {
    action: command.action,
    params: command.params
  });
}

// Eksportuj funkcje i stałe
export {
  CommandTypes,
  commandPatterns,
  checkForBrowserCommand,
  executeBrowserCommand
};
