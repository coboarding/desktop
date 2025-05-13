// Simple React implementation for the VideoChat LLM app
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  
  // Create main UI structure with full screen layout
  root.innerHTML = `
    <div class="app-container">
      <header class="app-header">
        <h1>VideoChat LLM</h1>
      </header>
      
      <main class="app-content">
        <div class="main-layout">
          <div class="left-panel">
            <div class="user-video">
              <h2>Twój obraz</h2>
              <div id="user-video-placeholder">
                <p>Ładowanie kamery...</p>
              </div>
            </div>
            
            <div class="chat-container">
              <h2>Czat</h2>
              <div id="chat-history"></div>
              <div class="controls">
                <button id="start-btn">Start</button>
                <button id="stop-btn">Stop</button>
              </div>
            </div>
          </div>
          
          <div class="right-panel">
            <div class="bot-container">
              <h2>Asystent</h2>
              <div id="ascii-container">
                <iframe id="novnc-frame" src="about:blank" frameborder="0"></iframe>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  
  // Add custom styles for full screen layout
  const style = document.createElement('style');
  style.textContent = `
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
    
    .app-header {
      background-color: #282a36;
      color: #50fa7b;
      padding: 10px 20px;
      text-align: center;
    }
    
    .app-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .main-layout {
      display: flex;
      height: 100%;
      width: 100%;
    }
    
    .left-panel {
      width: 40%;
      display: flex;
      flex-direction: column;
      padding: 10px;
      border-right: 1px solid #44475a;
    }
    
    .right-panel {
      width: 60%;
      padding: 10px;
    }
    
    .user-video {
      height: 30%;
      background-color: #1e1e2e;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 10px;
    }
    
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #1e1e2e;
      border-radius: 8px;
      padding: 10px;
      margin-top: 10px;
    }
    
    #chat-history {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 10px;
      padding: 10px;
      background-color: #282a36;
      border-radius: 5px;
    }
    
    .bot-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #1e1e2e;
      border-radius: 8px;
      padding: 10px;
    }
    
    #ascii-container {
      flex: 1;
      overflow: hidden;
    }
    
    #novnc-frame {
      width: 100%;
      height: 100%;
      border: none;
      background-color: #282a36;
    }
    
    .message {
      margin-bottom: 10px;
      padding: 8px;
      border-radius: 5px;
    }
    
    .user-message {
      background-color: #44475a;
      margin-left: 20px;
    }
    
    .assistant-message {
      background-color: #6272a4;
      margin-right: 20px;
    }
    
    .message-sender {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .controls {
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 10px 0;
    }
    
    button {
      padding: 8px 16px;
      background-color: #bd93f9;
      color: #282a36;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    
    button:hover {
      background-color: #ff79c6;
    }
    
    button:disabled {
      background-color: #6272a4;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);
  
  // Initialize socket connection
  const socket = io();
  const chatHistory = document.getElementById('chat-history');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  
  // Handle incoming transcriptions
  socket.on('transcription', (data) => {
    if (data.user) {
      addMessage('user', data.user);
    }
    if (data.assistant) {
      addMessage('assistant', data.assistant);
    }
  });
  
  // Handle audio responses
  socket.on('audio-response', (audioData) => {
    // In a real implementation, this would play the audio
    console.log('Received audio response');
  });
  
  // Add message to chat history
  function addMessage(sender, text) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}-message`;
    messageEl.innerHTML = `
      <div class="message-sender">${sender === 'user' ? 'Ty' : 'Asystent'}</div>
      <div class="message-text">${text}</div>
    `;
    chatHistory.appendChild(messageEl);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
  
  // Initialize camera (simplified)
  function initCamera() {
    const videoPlaceholder = document.getElementById('user-video-placeholder');
    videoPlaceholder.innerHTML = '<p>Kamera niedostępna w tej wersji</p>';
  }
  
  // Initialize audio recording with auto-start
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  
  // Function to start audio recording with Web Speech API
  async function startRecording() {
    try {
      // Sprawdzenie czy przeglądarka obsługuje Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Web Speech API nie jest obsługiwana w tej przeglądarce');
        addMessage('system', 'Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj użyć Chrome.');
        
        // Fallback do zwykłego nagrywania audio
        startFallbackRecording();
        return;
      }
      
      // Inicjalizacja Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Konfiguracja
      recognition.lang = 'pl-PL';
      recognition.continuous = true;
      recognition.interimResults = true;
      
      let finalTranscript = '';
      let interimTranscript = '';
      
      // Obsługa wyników rozpoznawania
      recognition.onresult = (event) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            
            // Wyślij transkrypcję do serwera
            const transcriptData = {
              transcript: finalTranscript.trim()
            };
            
            // Konwersja do JSON i wysyłanie
            const jsonStr = JSON.stringify(transcriptData);
            const base64data = btoa(jsonStr);
            socket.emit('audio-data', base64data);
            
            // Wyczyść transkrypcję po wysłaniu
            finalTranscript = '';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Aktualizacja interfejsu użytkownika
        if (interimTranscript) {
          // Pokaż tymczasową transkrypcję w interfejsie
          document.getElementById('interim-text').textContent = interimTranscript;
        }
      };
      
      // Obsługa błędów
      recognition.onerror = (event) => {
        console.error('Błąd rozpoznawania mowy:', event.error);
        if (event.error === 'no-speech') {
          console.log('Nie wykryto mowy');
        } else {
          addMessage('system', `Błąd rozpoznawania mowy: ${event.error}`);
        }
      };
      
      // Rozpocznij rozpoznawanie
      recognition.start();
      window.speechRecognition = recognition; // Zapisz referencję do globalnej zmiennej
      
      // Dodaj element do wyświetlania tymczasowej transkrypcji
      if (!document.getElementById('interim-text')) {
        const interimElement = document.createElement('div');
        interimElement.id = 'interim-text';
        interimElement.className = 'interim-transcript';
        document.getElementById('chat-history').appendChild(interimElement);
      }
      
      isRecording = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      console.log('Rozpoczęto rozpoznawanie mowy');
      
      // Aktualizacja interfejsu
      addMessage('system', 'Mikrofon aktywny - mów wyraźnie po polsku');
    } catch (error) {
      console.error('Błąd dostępu do mikrofonu:', error);
      addMessage('system', 'Błąd dostępu do mikrofonu. Sprawdź uprawnienia.');
      
      // Fallback do zwykłego nagrywania
      startFallbackRecording();
    }
  }
  
  // Fallback do zwykłego nagrywania audio (gdy Web Speech API nie jest dostępne)
  async function startFallbackRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Send audio data to server
          const audioBlob = new Blob(audioChunks);
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            socket.emit('audio-data', base64data);
            audioChunks = [];
          };
          reader.readAsDataURL(audioBlob);
        }
      });
      
      mediaRecorder.start(1000); // Capture in 1-second intervals
      isRecording = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      console.log('Started recording in fallback mode');
      
      // Update UI to show recording is active
      addMessage('system', 'Mikrofon aktywny w trybie awaryjnym - mowa będzie rozpoznawana na serwerze');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addMessage('system', 'Błąd dostępu do mikrofonu. Sprawdź uprawnienia.');
    }
  }
  
  // Function to stop recording
  function stopRecording() {
    // Zatrzymaj Web Speech API jeśli jest aktywne
    if (window.speechRecognition) {
      window.speechRecognition.stop();
      console.log('Zatrzymano rozpoznawanie mowy');
      
      // Usuń element tymczasowej transkrypcji
      const interimElement = document.getElementById('interim-text');
      if (interimElement) {
        interimElement.textContent = '';
      }
    }
    
    // Zatrzymaj mediaRecorder jeśli jest aktywny (tryb awaryjny)
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      console.log('Zatrzymano nagrywanie audio');
    }
    
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    addMessage('system', 'Mikrofon wyłączony');
  }
  
  // Add event listeners to buttons
  startBtn.addEventListener('click', startRecording);
  
  stopBtn.addEventListener('click', stopRecording);
  
  // Function to fetch and set the noVNC port
  async function setupNoVNC() {
    try {
      const response = await fetch('/api/novnc-port');
      const data = await response.json();
      
      if (data.port) {
        const novncFrame = document.getElementById('novnc-frame');
        // Set the iframe source to the correct port
        novncFrame.src = `http://${window.location.hostname}:${data.port}/`;
        console.log(`NoVNC iframe set to port: ${data.port}`);
      } else {
        console.error('No noVNC port received from server');
      }
    } catch (error) {
      console.error('Error fetching noVNC port:', error);
    }
  }

  // Initialize the app
  initCamera();
  setupNoVNC();
  
  // Auto-start audio recording when the app loads
  setTimeout(() => {
    startRecording();
  }, 1500); // Short delay to ensure everything is loaded
});
