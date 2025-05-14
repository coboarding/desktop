/**
 * Główny plik aplikacji VideoChat LLM
 * Importuje i używa wszystkich modułów
 */

// Import modułów
import * as SpeechRecognition from './speechRecognition.js';
import * as SpeechSynthesis from './speechSynthesis.js';
import * as SocketHandlers from './socketHandlers.js';
import * as UIComponents from './uiComponents.js';
import * as HTMLStructure from './htmlStructure.js';
import * as BrowserCommands from './browserCommands.js';

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicjalizacja aplikacji VideoChat LLM');
  
  // Generowanie struktury HTML
  HTMLStructure.generateHTMLStructure();
  
  // Dodanie stylów CSS
  HTMLStructure.addStyles();
  
  // Inicjalizacja syntezy mowy
  SpeechSynthesis.initSpeechSynthesis();
  
  // Inicjalizacja socket.io
  const socket = SocketHandlers.initSocketConnection();
  
  // Udostępnij funkcje globalnie
  window.addMessage = UIComponents.addMessage;
  window.createVolumeIndicator = UIComponents.createVolumeIndicator;
  window.pulseVolumeIndicator = UIComponents.pulseVolumeIndicator;
  window.socket = socket;
  window.startRecording = SpeechRecognition.startRecording;
  window.stopRecording = SpeechRecognition.stopRecording;
  window.isRecording = false;
  
  // Inicjalizacja obsługi zdarzeń socket.io
  SocketHandlers.setupAudioResponseHandler(UIComponents.addMessage);
  SocketHandlers.setupTTSHandler(SpeechSynthesis.handleTTSRequest);
  SocketHandlers.setupLLMResponseHandler(UIComponents.addMessage);
  SocketHandlers.setupNoVNCStatusHandler();
  SocketHandlers.setupBrowserCommandResponseHandler(UIComponents.addMessage);
  
  // Dodanie obsługi komend przeglądarki do obiektu window
  window.checkForBrowserCommand = BrowserCommands.checkForBrowserCommand;
  window.executeBrowserCommand = (command) => {
    BrowserCommands.executeBrowserCommand(command, socket);
  };
  
  // Inicjalizacja kamery
  UIComponents.initCamera();
  
  // Inicjalizacja przycisków komend
  UIComponents.setupCommandButtons(socket);
  
  // Inicjalizacja przycisków nagrywania
  UIComponents.setupRecordingButtons(
    SpeechRecognition.startRecording,
    SpeechRecognition.stopRecording
  );
  
  // Inicjalizacja noVNC
  UIComponents.setupNoVNC();
  
  // Automatyczne uruchomienie nagrywania po załadowaniu strony
  setTimeout(() => {
    try {
      SpeechRecognition.startRecording();
    } catch (error) {
      console.error('Błąd automatycznego uruchamiania nagrywania:', error);
      UIComponents.addMessage('system', 'Nie udało się automatycznie uruchomić nagrywania. Kliknij przycisk Start, aby rozpocząć.');
    }
  }, 1000);
});

// Obsługa zamykania strony
window.addEventListener('beforeunload', () => {
  // Zatrzymaj nagrywanie
  if (window.isRecording) {
    SpeechRecognition.stopRecording();
  }
  
  // Zatrzymaj syntezę mowy
  SpeechSynthesis.stopSpeaking();
});
