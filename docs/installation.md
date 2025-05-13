# Instalacja VideoChat LLM - Przewodnik

## Wymagania systemowe

### Zależności systemowe

Aplikacja VideoChat LLM wymaga następujących zależności systemowych do prawidłowego działania:

#### Debian/Ubuntu
```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

#### Fedora/RHEL
```bash
sudo dnf install -y gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel librsvg2-devel
```

#### Arch Linux
```bash
sudo pacman -Sy --noconfirm base-devel cairo pango libjpeg-turbo giflib librsvg
```

### Środowisko Node.js

- Node.js (wersja 18.x lub nowsza)
- npm (wersja 8.x lub nowsza)

## Proces instalacji

### Automatyczna instalacja

Najłatwiejszym sposobem instalacji jest użycie skryptu `install.sh`:

```bash
./install.sh
```

Skrypt automatycznie:
1. Sprawdza i instaluje wymagane zależności systemowe
2. Pobiera niezbędne modele AI
3. Konfiguruje środowisko aplikacji
4. Instaluje zależności npm
5. Konfiguruje uprawnienia dla Electron

### Ręczna instalacja

Jeśli wolisz zainstalować aplikację ręcznie:

1. Zainstaluj zależności systemowe odpowiednie dla Twojego systemu operacyjnego
2. Utwórz strukturę katalogów dla modeli:
   ```bash
   mkdir -p models/{llm,tts,stt}
   ```
3. Pobierz modele AI:
   - TinyLlama 1.1B ONNX do `models/llm/model.onnx`
   - Model TTS Piper do `models/tts/model.bin`
   - Model Whisper Tiny do `models/stt/model.bin`
4. Zainstaluj zależności npm:
   ```bash
   npm install --no-optional
   ```
5. Skonfiguruj uprawnienia dla Electron:
   ```bash
   sudo chown root:root node_modules/electron/dist/chrome-sandbox
   sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
   ```

## Rozwiązywanie problemów

### Problemy z instalacją npm

Jeśli napotkasz problemy podczas instalacji zależności npm:

1. Usuń istniejące pliki `node_modules` i `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   ```
2. Spróbuj zainstalować z pominięciem opcjonalnych zależności:
   ```bash
   npm install --no-optional
   ```
3. Sprawdź logi npm w katalogu `~/.npm/_logs/`

### Problemy z uruchomieniem Electron

Jeśli aplikacja nie uruchamia się z błędem dotyczącym sandbox:

```
The SUID sandbox helper binary was found, but is not configured correctly.
```

Wykonaj następujące polecenia:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

### Problemy z modułami natywnymi

Jeśli występują problemy z modułami natywnymi (np. canvas, node-gyp):

1. Upewnij się, że wszystkie zależności systemowe są zainstalowane
2. Spróbuj przebudować moduły natywne:
   ```bash
   npm rebuild
   ```

## Uruchamianie aplikacji

Po pomyślnej instalacji, uruchom aplikację poleceniem:

```bash
./bin/start-app
```

## Aktualizacja

Aby zaktualizować aplikację:

1. Pobierz najnowszą wersję kodu źródłowego
2. Uruchom skrypt instalacyjny ponownie:
   ```bash
   ./install.sh
   ```
