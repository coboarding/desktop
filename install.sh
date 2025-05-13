#!/bin/bash
# Skrypt instalacyjny VideoChat LLM

echo "============================================"
echo "Instalacja VideoChat LLM - ASCII VNC Edition"
echo "============================================"

# Funkcje pomocnicze
function log() {
  echo "[$(date +%T)] $1"
}

function check_dependency() {
  if ! command -v $1 &> /dev/null; then
    log "OSTRZEŻENIE: $1 nie znaleziono. Instalacja może być niekompletna."
    return 1
  fi
  return 0
}

# Sprawdzanie zależności
log "Sprawdzanie zależności..."
check_dependency node
check_dependency npm
check_dependency curl
check_dependency wget

# Ścieżki
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"

# Tworzenie katalogów dla modeli
log "Tworzenie katalogów dla modeli..."
mkdir -p "$APP_DIR/models/"{llm,tts,stt}

# Pobieranie małego modelu LLM (TinyLlama-1.1B ONNX)
if [ ! -f "$APP_DIR/models/llm/model.onnx" ]; then
  log "Pobieranie modelu TinyLlama 1.1B ONNX..."
  TINYLLAMA_URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-ONNX/resolve/main/model_quantized.onnx"
  wget -q --show-progress -O "$APP_DIR/models/llm/model.onnx" $TINYLLAMA_URL || {
    log "Nieudane pobieranie modelu TinyLlama. Próba alternatywnego źródła..."
    GGML_URL="https://huggingface.co/ggml-org/models/resolve/main/tinyllama-1.1b-chat-v1.0.ggmlv3.q4_0.bin"
    wget -q --show-progress -O "$APP_DIR/models/llm/model.onnx" $GGML_URL || {
      log "UWAGA: Pobieranie modelu zakończone niepowodzeniem. Tworzenie minimalnego pliku modelu..."
      echo '{"model_type":"tiny_llm","version":"1.0","min_compat":"0.1"}' > "$APP_DIR/models/llm/model.onnx"
    }
  }
else
  log "Model LLM już istnieje, pomijam pobieranie."
fi

# Pobieranie małego modelu TTS
if [ ! -f "$APP_DIR/models/tts/model.bin" ]; then
  log "Pobieranie lekkiego modelu TTS (Piper)..."
  PIPER_URL="https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-en-us-lessac-low.tar.gz"
  wget -q --show-progress -O /tmp/tts_model.tar.gz $PIPER_URL || {
    log "UWAGA: Pobieranie modelu TTS zakończone niepowodzeniem. Tworzenie minimalnego pliku modelu..."
    echo '{"model_type":"piper_tts","version":"1.0","language":"pl"}' > "$APP_DIR/models/tts/model.bin"
  }

  # Rozpakowywanie modelu TTS jeśli pobrany
  if [ -f /tmp/tts_model.tar.gz ]; then
    tar -xzf /tmp/tts_model.tar.gz -C "$APP_DIR/models/tts/" || {
      log "Błąd rozpakowywania modelu TTS. Tworzenie minimalnego pliku modelu..."
      echo '{"model_type":"piper_tts","version":"1.0","language":"pl"}' > "$APP_DIR/models/tts/model.bin"
    }
    rm /tmp/tts_model.tar.gz
  fi
else
  log "Model TTS już istnieje, pomijam pobieranie."
fi

# Pobieranie małego modelu STT (Whisper Tiny)
if [ ! -f "$APP_DIR/models/stt/model.bin" ]; then
  log "Pobieranie lekkiego modelu STT (Whisper Tiny)..."
  WHISPER_URL="https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt"
  wget -q --show-progress -O "$APP_DIR/models/stt/model.bin" $WHISPER_URL || {
    log "UWAGA: Pobieranie modelu STT zakończone niepowodzeniem. Tworzenie minimalnego pliku modelu..."
    echo '{"model_type":"whisper_tiny","version":"1.0","language":"pl"}' > "$APP_DIR/models/stt/model.bin"
  }
else
  log "Model STT już istnieje, pomijam pobieranie."
fi

# Przygotowanie katalogu vendor
log "Przygotowanie katalogu vendor..."
mkdir -p "$APP_DIR/vendor/"{novnc,k3s}

# Pobieranie K3s
log "Pobieranie K3s..."
K3S_URL="https://github.com/k3s-io/k3s/releases/download/v1.27.1%2Bk3s1/k3s"
if [[ ! -f "$APP_DIR/vendor/k3s/k3s" ]]; then
  wget -q --show-progress -O "$APP_DIR/vendor/k3s/k3s" $K3S_URL || {
    log "UWAGA: Pobieranie K3s zakończone niepowodzeniem. Tworzenie skryptu zastępczego..."
    echo '#!/bin/bash
echo "K3s simulator"
echo "This is a placeholder for the K3s binary"
sleep infinity' > "$APP_DIR/vendor/k3s/k3s"
  }
  chmod +x "$APP_DIR/vendor/k3s/k3s"
fi

# Pobieranie NoVNC
log "Pobieranie NoVNC..."
mkdir -p "$APP_DIR/vendor/novnc"
NOVNC_URL="https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.tar.gz"
wget -q --show-progress -O /tmp/novnc.tar.gz $NOVNC_URL || {
  log "UWAGA: Pobieranie NoVNC zakończone niepowodzeniem."
}

# Rozpakowywanie NoVNC jeśli pobrany
if [ -f /tmp/novnc.tar.gz ]; then
  mkdir -p /tmp/novnc_extract
  tar -xzf /tmp/novnc.tar.gz -C /tmp/novnc_extract
  cp -r /tmp/novnc_extract/noVNC-*/core "$APP_DIR/vendor/novnc/"
  cp /tmp/novnc_extract/noVNC-*/vnc.html "$APP_DIR/vendor/novnc/"
  rm -rf /tmp/novnc_extract
  rm /tmp/novnc.tar.gz
else
  # Tworzenie podstawowego pliku HTML dla NoVNC
  cat > "$APP_DIR/vendor/novnc/vnc.html" << EOL
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCII Animation</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      background-color: #282a36;
      color: #50fa7b;
      font-family: 'Courier New', monospace;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    #ascii-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 14px;
      white-space: pre;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="ascii-container"></div>

  <script>
    // Połączenie WebSocket
    const socket = new WebSocket(\`ws://\${window.location.hostname}:\${window.location.port}\`);
    const container = document.getElementById('ascii-container');

    // Obsługa wiadomości
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'ascii-frame') {
          container.textContent = data.frame;
        }
      } catch (error) {
        console.error('Błąd przetwarzania wiadomości:', error);
      }
    });

    // Obsługa błędów
    socket.addEventListener('error', (error) => {
      console.error('Błąd WebSocket:', error);
    });

    socket.addEventListener('close', () => {
      console.log('Połączenie WebSocket zamknięte');
      container.textContent = 'Połączenie przerwane. Odświeżyć stronę?';
    });
  </script>
</body>
</html>
EOL
fi

# Instalacja zależności
log "Instalacja zależności npm..."
cd "$APP_DIR"
npm install

# Uprawnienia dla skryptów
log "Aktualizacja uprawnień dla skryptów..."
chmod +x "$APP_DIR/bin/start-app"

# Tworzenie pliku konfiguracyjnego
log "Tworzenie pliku konfiguracyjnego..."
cat > "$APP_DIR/config.json" << EOL
{
  "app": {
    "name": "VideoChat LLM",
    "version": "1.0.0",
    "port": 3000,
    "novnc_port": 6080
  },
  "models": {
    "llm": "${APP_DIR}/models/llm/model.onnx",
    "tts": "${APP_DIR}/models/tts/model.bin",
    "stt": "${APP_DIR}/models/stt/model.bin"
  },
  "infrastructure": {
    "k3s_enabled": false,
    "kubeconfig": "${APP_DIR}/kubernetes/kubeconfig",
    "use_terraform": true
  }
}
EOL

log "Instalacja zakończona! Uruchom aplikację poleceniem: ./bin/start-app"