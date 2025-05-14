/**
 * Skrypt do budowania aplikacji
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

// Główna funkcja budująca
async function build() {
  log('Rozpoczynanie procesu budowania aplikacji...', colors.bright + colors.green);
  
  // Sprawdź, czy katalog dist istnieje, jeśli nie, utwórz go
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    log('Tworzenie katalogu dist...', colors.blue);
    fs.mkdirSync(distPath, { recursive: true });
  }
  
  // Budowanie frontendu za pomocą Webpack
  log('Budowanie frontendu za pomocą Webpack...', colors.magenta);
  if (!execute('npx webpack --mode production')) {
    log('Błąd podczas budowania frontendu!', colors.red);
    return;
  }
  
  // Kopiowanie plików statycznych
  log('Kopiowanie plików statycznych...', colors.blue);
  const staticFiles = [
    { src: 'src/renderer/styles.css', dest: 'dist/styles.css' },
    { src: 'src/renderer/index.html', dest: 'dist/index.html' }
  ];
  
  for (const file of staticFiles) {
    try {
      fs.copyFileSync(path.join(__dirname, file.src), path.join(__dirname, file.dest));
      log(`Skopiowano: ${file.src} -> ${file.dest}`, colors.green);
    } catch (error) {
      log(`Błąd kopiowania pliku ${file.src}: ${error.message}`, colors.red);
    }
  }
  
  // Budowanie aplikacji Electron
  log('Budowanie aplikacji Electron...', colors.magenta);
  if (!execute('npx electron-builder')) {
    log('Błąd podczas budowania aplikacji Electron!', colors.red);
    return;
  }
  
  log('Proces budowania zakończony pomyślnie!', colors.bright + colors.green);
}

// Uruchomienie procesu budowania
build().catch(error => {
  log(`Nieoczekiwany błąd: ${error.message}`, colors.red);
  process.exit(1);
});
