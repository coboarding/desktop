#!/bin/bash
# Skrypt do budowania aplikacji VideoChat LLM

echo "==================================================="
echo "Budowanie aplikacji VideoChat LLM - ASCII VNC Edition"
echo "==================================================="

# Funkcje pomocnicze
function log() {
  echo "[$(date +%T)] $1"
}

function check_dependency() {
  if ! command -v $1 &> /dev/null; then
    log "BŁĄD: $1 nie znaleziono. Instalacja wymagana."
    exit 1
  fi
}

# Sprawdzanie zależności
log "Sprawdzanie zależności..."
check_dependency node
check_dependency npm

# Instalacja electron-builder lokalnie, jeśli nie ma node_modules/.bin/electron-builder
if [ ! -f "$APP_DIR/node_modules/.bin/electron-builder" ]; then
  log "Instalowanie electron-builder lokalnie..."
  npm install --save-dev electron-builder
fi

# Ścieżki
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"

# Czyszczenie katalogu dist
log "Czyszczenie katalogu dist..."
rm -rf "$APP_DIR/dist"

# Instalacja zależności
log "Instalacja zależności..."
cd "$APP_DIR"
npm install

# Tworzenie katalogów jeśli nie istnieją
log "Sprawdzanie katalogów..."
mkdir -p "$APP_DIR/models/"{llm,tts,stt}
mkdir -p "$APP_DIR/vendor/"{novnc,k3s}

# Tworzenie pustych plików modeli dla struktury
touch "$APP_DIR/models/llm/model.onnx"
touch "$APP_DIR/models/tts/model.bin"
touch "$APP_DIR/models/stt/model.bin"

# Tworzenie przykładowego pliku noVNC
if [[ ! -f "$APP_DIR/vendor/novnc/vnc.html" ]]; then
  mkdir -p "$APP_DIR/vendor/novnc"
  cat > "$APP_DIR/vendor/novnc/vnc.html" << EOL
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ASCII Animation</title>
</head>
<body>
  <div id="ascii-container" style="font-family: monospace; white-space: pre;"></div>
  <script>
    // Przykładowy plik noVNC
    document.getElementById('ascii-container').textContent = 'ASCII Animation Placeholder';
  </script>
</body>
</html>
EOL
fi

# Budowanie aplikacji
log "Budowanie aplikacji Electron..."
npx electron-builder --linux

log "Budowanie zakończone! Pakiety instalacyjne znajdują się w katalogu 'dist'"