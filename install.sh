#!/bin/bash
# install.sh

echo "Instalacja VideoChat LLM..."

# Pobieranie modeli (w rzeczywistej aplikacji)
echo "Pobieranie modeli LLM, TTS i STT..."
mkdir -p models/{llm,tts,stt}

# Można pobrać tutaj małe modele onnx
# curl -L -o models/llm/model.onnx https://example.com/models/tiny-llm.onnx
# curl -L -o models/tts/model.onnx https://example.com/models/tts-pl.onnx
# curl -L -o models/stt/model.onnx https://example.com/models/whisper-small-pl.onnx

# Instalacja zależności
echo "Instalacja zależności..."
npm install

# Przygotowanie frontendu
echo "Budowanie frontendu..."
cd src/renderer
npm install
npm run build
cd ../..

# Pobranie K3s
echo "Pobieranie K3s..."
mkdir -p vendor/k3s
curl -L -o vendor/k3s/k3s https://github.com/k3s-io/k3s/releases/download/v1.27.1%2Bk3s1/k3s
chmod +x vendor/k3s/k3s

echo "Instalacja zakończona! Uruchom aplikację poleceniem: npm start"