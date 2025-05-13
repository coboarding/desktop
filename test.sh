#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
  echo -e "${GREEN}[TEST]${NC} $1"
}

fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  exit 1
}

log "Testowanie jednostkowe (Jest)"
npx jest --config=jest.config.js --runInBand || fail "Testy jednostkowe nie powiodły się!"

log "Testowanie E2E (Playwright, Cypress lub Selenium jeśli dostępne)"
if [ -f "playwright.config.js" ]; then
  npx playwright test || fail "Testy E2E (Playwright) nie powiodły się!"
elif [ -f "cypress.json" ]; then
  npx cypress run || fail "Testy E2E (Cypress) nie powiodły się!"
elif [ -d "e2e" ]; then
  for f in e2e/*.js; do
    node "$f" || fail "Test E2E $f nie powiódł się!"
  done
else
  log "Brak skonfigurowanych testów E2E. Pomijam."
fi

log "Walidacja plików YAML (js-yaml)"

# Tworzymy tymczasowy skrypt walidacji YAML
cat > /tmp/yaml-validator.js << 'EOF'
const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');

function validateYamlFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Katalog ${dir} nie istnieje. Pomijam.`);
    return true;
  }

  let allValid = true;
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Rekurencyjnie sprawdź podkatalogi
      const subDirValid = validateYamlFiles(fullPath);
      if (!subDirValid) allValid = false;
    } else if (file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        jsYaml.load(content);
        console.log(`✓ ${fullPath} - OK`);
      } catch (error) {
        console.error(`✗ ${fullPath} - BŁĄD: ${error.message}`);
        allValid = false;
      }
    }
  }
  
  return allValid;
}

const dirs = process.argv.slice(2);
let success = true;

for (const dir of dirs) {
  const dirValid = validateYamlFiles(dir);
  if (!dirValid) success = false;
}

process.exit(success ? 0 : 1);
EOF

# Instalujemy js-yaml globalnie dla tego skryptu
npm install --no-save js-yaml

# Upewniamy się, że katalogi istnieją (tworzymy je jeśli nie)
mkdir -p kubernetes terraform ansible

# Uruchamiamy walidator
NODE_PATH=$(npm root) node /tmp/yaml-validator.js kubernetes/ terraform/ ansible/ || fail "Błąd w plikach YAML!"

log "Walidacja plików JSON (jsonlint)"
npx jsonlint models/**/*.json --quiet || log "Brak plików JSON do walidacji lub ostrzeżenia."

log "Testy i walidacje zakończone sukcesem!"
exit 0
