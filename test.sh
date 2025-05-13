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

log "Walidacja plików YAML (yamllint)"
npx yamllint kubernetes/ terraform/ ansible/ || fail "Błąd w plikach YAML!"

log "Walidacja plików JSON (jsonlint)"
npx jsonlint models/**/*.json --quiet || log "Brak plików JSON do walidacji lub ostrzeżenia."

log "Testy i walidacje zakończone sukcesem!"
exit 0
