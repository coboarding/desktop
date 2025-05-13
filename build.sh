# build.sh
#!/bin/bash

echo "Budowanie aplikacji VideoChat LLM..."

# Instalacja zależności
npm install

# Przygotowanie frontendu
cd src/renderer
npm install
npm run build
cd ../..

# Przygotowanie modeli (tutaj możemy użyć domyślnych lub pobrać)
mkdir -p models/{llm,tts,stt}

# Budowanie aplikacji Electron
npm run build

echo "Budowanie zakończone! Pakiety instalacyjne znajdują się w katalogu 'dist'"