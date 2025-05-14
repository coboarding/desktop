/**
 * Moduł obsługujący komunikację przez socket.io
 */

// Referencja do obiektu socket
let socket = null;

/**
 * Inicjalizacja połączenia socket.io
 */
function initSocketConnection() {
  // Sprawdź, czy socket.io jest dostępne
  if (typeof io === 'undefined') {
    console.error('Socket.io nie jest dostępne');
    return null;
  }
  
  // Utwórz połączenie
  socket = io();
  
  console.log('Inicjalizacja połączenia socket.io');
  
  // Obsługa połączenia
  socket.on('connect', () => {
    console.log('Połączono z serwerem przez socket.io');
  });
  
  // Obsługa rozłączenia
  socket.on('disconnect', () => {
    console.log('Rozłączono z serwerem socket.io');
  });
  
  // Obsługa błędów
  socket.on('connect_error', (error) => {
    console.error('Błąd połączenia socket.io:', error);
  });
  
  return socket;
}

/**
 * Obsługa odpowiedzi audio z serwera
 * @param {Function} addMessage - Funkcja dodająca wiadomość do czatu
 */
function setupAudioResponseHandler(addMessage) {
  if (!socket) {
    console.error('Socket.io nie jest zainicjalizowane');
    return;
  }
  
  socket.on('audio-response', (audioData) => {
    try {
      // Konwersja danych binarnych na ArrayBuffer
      const buffer = new Uint8Array(audioData).buffer;
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      
      // Odtwórz audio
      const audio = new Audio(audioUrl);
      
      // Zwolnienie URL po zakończeniu odtwarzania
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play().catch(error => {
        console.error('Błąd odtwarzania audio:', error);
      });
    } catch (error) {
      console.error('Błąd odtwarzania audio:', error);
      addMessage('system', 'Błąd odtwarzania odpowiedzi głosowej');
    }
  });
}

/**
 * Obsługa żądania TTS z serwera
 * @param {Function} handleTTSRequest - Funkcja obsługująca żądanie TTS
 */
function setupTTSHandler(handleTTSRequest) {
  if (!socket) {
    console.error('Socket.io nie jest zainicjalizowane');
    return;
  }
  
  socket.on('web-tts', (data) => {
    handleTTSRequest(data);
  });
}

/**
 * Obsługa odpowiedzi LLM z serwera
 * @param {Function} addMessage - Funkcja dodająca wiadomość do czatu
 */
function setupLLMResponseHandler(addMessage) {
  if (!socket) {
    console.error('Socket.io nie jest zainicjalizowane');
    return;
  }
  
  socket.on('llm-response', (data) => {
    console.log('Otrzymano odpowiedź LLM:', data);
    addMessage('assistant', data.text);
  });
}

/**
 * Obsługa statusu noVNC z serwera
 */
function setupNoVNCStatusHandler() {
  if (!socket) {
    console.error('Socket.io nie jest zainicjalizowane');
    return;
  }
  
  socket.on('novnc-status', (data) => {
    console.log('Otrzymano status noVNC:', data);
    
    // Aktualizuj iframe z noVNC, jeśli istnieje
    const novncIframe = document.getElementById('novnc-iframe');
    if (novncIframe && data.port) {
      const novncUrl = `http://${window.location.hostname}:${data.port}/vnc.html?autoconnect=true&resize=scale&quality=9`;
      novncIframe.src = novncUrl;
    }
  });
}

/**
 * Wysłanie transkrypcji do serwera
 * @param {string} transcript - Transkrypcja do wysłania
 */
function sendTranscription(transcript) {
  if (!socket) {
    console.error('Socket.io nie jest zainicjalizowane');
    return;
  }
  
  socket.emit('web-stt-result', { transcript });
}

/**
 * Wysłanie komendy przeglądarki do serwera
 * @param {Object} command - Komenda przeglądarki
 */
function sendBrowserCommand(command) {
  if (!socket) {
    console.error('Socket.io nie jest zainicjalizowane');
    return;
  }
  
  console.log('Wysyłanie komendy przeglądarki do serwera:', command);
  socket.emit('browser-command', command);
}

/**
 * Konfiguracja obsługi odpowiedzi na komendy przeglądarki
 * @param {Function} addMessage - Funkcja dodająca wiadomość do czatu
 */
function setupBrowserCommandResponseHandler(addMessage) {
  if (!socket) {
    console.error('Socket.io nie jest zainicjalizowane');
    return;
  }
  
  socket.on('browser-command-response', (data) => {
    console.log('Otrzymano odpowiedź na komendę przeglądarki:', data);
    
    if (data.success) {
      addMessage('system', `Komenda przeglądarki wykonana: ${data.message || 'Brak szczegółów'}`);
    } else {
      addMessage('system', `Błąd wykonania komendy przeglądarki: ${data.error || 'Nieznany błąd'}`);
    }
  });
}

// Eksportuj funkcje i obiekt socket
export {
  initSocketConnection,
  setupAudioResponseHandler,
  setupTTSHandler,
  setupLLMResponseHandler,
  setupNoVNCStatusHandler,
  setupBrowserCommandResponseHandler,
  sendTranscription,
  sendBrowserCommand
};
