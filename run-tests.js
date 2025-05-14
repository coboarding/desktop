/**
 * Skrypt do uruchamiania testów jednostkowych
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Kolory dla konsoli
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Funkcja do logowania z kolorami
function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

// Funkcja do wykonywania poleceń
function execute(command, options = {}) {
  log(`Wykonywanie: ${command}`, colors.yellow);
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    log(`Błąd wykonywania polecenia: ${error.message}`, colors.red);
    return false;
  }
}

// Główna funkcja uruchamiająca testy
async function runTests() {
  log('Rozpoczynanie testów jednostkowych...', colors.bright + colors.green);
  
  // Sprawdź, czy katalog testów istnieje
  const testsPath = path.join(__dirname, 'tests');
  if (!fs.existsSync(testsPath)) {
    log('Katalog testów nie istnieje!', colors.red);
    return;
  }
  
  // Uruchom testy za pomocą Jest
  log('Uruchamianie testów za pomocą Jest...', colors.magenta);
  if (!execute('npx jest')) {
    log('Błąd podczas uruchamiania testów!', colors.red);
    return;
  }
  
  log('Testy zakończone pomyślnie!', colors.bright + colors.green);
}

// Uruchomienie testów
runTests().catch(error => {
  log(`Nieoczekiwany błąd: ${error.message}`, colors.red);
  process.exit(1);
});
