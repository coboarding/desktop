/**
 * Moduł obsługujący komponenty interfejsu użytkownika
 */

/**
 * Dodanie wiadomości do historii czatu
 * @param {string} sender - Nadawca wiadomości (user, assistant, system)
 * @param {string} text - Treść wiadomości
 */
function addMessage(sender, text) {
  const chatHistory = document.getElementById('chat-history');
  
  // Utwórz element wiadomości
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}-message`;
  
  // Dodaj nagłówek
  const senderName = sender === 'user' ? 'Ty' : sender === 'assistant' ? 'Asystent' : 'System';
  const headerElement = document.createElement('div');
  headerElement.className = 'message-header';
  headerElement.textContent = senderName;
  messageElement.appendChild(headerElement);
  
  // Dodaj treść
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  contentElement.textContent = text;
  messageElement.appendChild(contentElement);
  
  // Dodaj do historii
  chatHistory.appendChild(messageElement);
  
  // Przewiń do dołu
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Inicjalizacja kamery
 */
async function initCamera() {
  try {
    const videoPlaceholder = document.getElementById('user-video-placeholder');
    
    // Utwórz element wideo
    const videoElement = document.createElement('video');
    videoElement.id = 'user-video';
    videoElement.autoplay = true;
    videoElement.muted = true;
    
    // Dodaj do placeholdera
    videoPlaceholder.innerHTML = '';
    videoPlaceholder.appendChild(videoElement);
    
    // Pobierz strumień wideo
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    
    // Przypisz strumień do elementu wideo
    videoElement.srcObject = stream;
    
    return true;
  } catch (error) {
    console.error('Błąd inicjalizacji kamery:', error);
    
    // Wyświetl komunikat o błędzie
    const videoPlaceholder = document.getElementById('user-video-placeholder');
    videoPlaceholder.innerHTML = '<p>Nie można uzyskać dostępu do kamery</p>';
    
    return false;
  }
}

/**
 * Tworzenie wskaźnika głośności
 */
function createVolumeIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'volume-indicator';
  
  // Dodaj elementy wskaźnika
  for (let i = 0; i < 5; i++) {
    const bar = document.createElement('div');
    bar.className = 'volume-bar';
    indicator.appendChild(bar);
  }
  
  return indicator;
}

/**
 * Pulsowanie wskaźnika głośności
 * @param {HTMLElement} indicator - Element wskaźnika głośności
 */
function pulseVolumeIndicator(indicator) {
  if (!indicator) return;
  
  // Losowa aktywacja pasków
  const bars = indicator.querySelectorAll('.volume-bar');
  
  // Funkcja animacji
  const animate = () => {
    bars.forEach(bar => {
      // Losowa wysokość dla każdego paska
      const height = Math.floor(Math.random() * 100);
      bar.style.height = `${height}%`;
      
      // Losowy kolor zależny od wysokości
      const hue = 120 + Math.floor((100 - height) * 1.2);
      bar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    });
    
    // Kontynuuj animację
    window.volumeAnimationId = requestAnimationFrame(animate);
  };
  
  // Rozpocznij animację
  animate();
}

/**
 * Zatrzymanie animacji wskaźnika głośności
 */
function stopVolumeIndicator() {
  if (window.volumeAnimationId) {
    cancelAnimationFrame(window.volumeAnimationId);
    window.volumeAnimationId = null;
  }
}

/**
 * Obsługa kliknięcia przycisku komendy
 * @param {Event} event - Zdarzenie kliknięcia
 */
function handleCommandButtonClick(event, socket) {
  const command = event.target.getAttribute('data-command');
  if (command) {
    console.log(`Kliknięto przycisk komendy: ${command}`);
    
    // Dodaj komendę do historii czatu jako wiadomość użytkownika
    addMessage('user', command);
    
    // Zatrzymaj rozpoznawanie mowy na czas wykonywania komendy
    if (window.currentRecognition) {
      console.log('Zatrzymywanie rozpoznawania mowy na czas wykonywania komendy');
      window.currentRecognition.stop();
    }
    
    // Wyślij komendę do serwera jako transkrypcję mowy
    socket.emit('web-stt-result', { transcript: command });
    
    // Wyłącz przyciski na chwilę, aby uniknąć wielokrotnych kliknięć
    const commandButtons = document.querySelectorAll('.command-btn');
    commandButtons.forEach(btn => {
      btn.disabled = true;
    });
    
    // Włącz przyciski ponownie po krótkim czasie
    setTimeout(() => {
      commandButtons.forEach(btn => {
        btn.disabled = false;
      });
      
      // Wznowienie rozpoznawania mowy po wykonaniu komendy
      if (window.isRecording && window.currentRecognition) {
        console.log('Wznawianie rozpoznawania mowy po wykonaniu komendy');
        try {
          window.startRecording();
        } catch (error) {
          console.error('Błąd wznawiania rozpoznawania mowy:', error);
        }
      }
    }, 3000);
  }
}

/**
 * Inicjalizacja obsługi przycisków komend
 */
function setupCommandButtons(socket) {
  const commandButtons = document.querySelectorAll('.command-btn');
  commandButtons.forEach(btn => {
    btn.addEventListener('click', (event) => handleCommandButtonClick(event, socket));
  });
}

/**
 * Inicjalizacja obsługi przycisków nagrywania
 */
function setupRecordingButtons(startRecording, stopRecording) {
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  
  if (startBtn) {
    startBtn.addEventListener('click', startRecording);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', stopRecording);
    stopBtn.disabled = true;
  }
}

/**
 * Konfiguracja noVNC
 */
async function setupNoVNC() {
  try {
    // Pobierz port noVNC z serwera
    const response = await fetch('/api/novnc-port');
    const data = await response.json();
    
    if (data.port) {
      console.log('Otrzymano port noVNC:', data.port);
      
      // Utwórz URL dla noVNC
      const novncUrl = `http://${window.location.hostname}:${data.port}/vnc.html?autoconnect=true&resize=scale&quality=9`;
      
      // Znajdź kontener noVNC
      const novncContainer = document.getElementById('novnc-container');
      if (novncContainer) {
        // Utwórz iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'novnc-iframe';
        iframe.src = novncUrl;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.frameBorder = '0';
        
        // Dodaj iframe do kontenera
        novncContainer.innerHTML = '';
        novncContainer.appendChild(iframe);
      }
    } else {
      console.error('Nie otrzymano portu noVNC');
    }
  } catch (error) {
    console.error('Błąd pobierania portu noVNC:', error);
  }
}

// Eksportuj funkcje
export {
  addMessage,
  initCamera,
  createVolumeIndicator,
  pulseVolumeIndicator,
  stopVolumeIndicator,
  handleCommandButtonClick,
  setupCommandButtons,
  setupRecordingButtons,
  setupNoVNC
};
