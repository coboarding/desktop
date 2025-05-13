// Simple React implementation for the VideoChat LLM app
document.addEventListener('DOMContentLoaded', () => {
  // Inicjalizacja Web Speech API
  if ('speechSynthesis' in window) {
    console.log('Web Speech API dostępne, inicjalizacja głosów...');
    // Wczytaj głosy - to może trwać chwilę
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log(`Załadowano ${voices.length} głosów:`, voices.map(v => `${v.name} (${v.lang})`));
    };
    // Wywołaj getVoices, aby rozpocząć ładowanie
    window.speechSynthesis.getVoices();
  } else {
    console.error('Web Speech API nie jest obsługiwane w tej przeglądarce');
  }
  
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
              <div class="command-shortcuts">
                <h3>Komendy dla bota:</h3>
                <div class="command-buttons">
                  <button class="command-btn" data-command="Wyszukaj w Google frazę 'Playwright browser automation'">Wyszukaj w Google</button>
                  <button class="command-btn" data-command="Wypełnij formularz na stronie W3Schools">Wypełnij formularz</button>
                  <button class="command-btn" data-command="Przejdź do strony example.com">Otwórz stronę</button>
                  <button class="command-btn" data-command="Zrób zrzut ekranu">Zrzut ekranu</button>
                  <button class="command-btn" data-command="Kliknij pierwszy link na stronie">Kliknij link</button>
                </div>
              </div>
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
    
    .command-shortcuts {
      margin: 10px 0;
      padding: 10px;
      background-color: #282a36;
      border-radius: 5px;
    }
    
    .command-shortcuts h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #50fa7b;
    }
    
    .command-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .command-btn {
      padding: 6px 10px;
      background-color: #ff79c6;
      color: #282a36;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      transition: all 0.2s ease;
    }
    
    .command-btn:hover {
      background-color: #50fa7b;
      transform: translateY(-2px);
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
    console.log('Otrzymano transkrypcję:', data);
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
  
  // Function to handle offline mode for speech recognition
  async function handleOfflineMode() {
    console.log('Przechodzenie do trybu offline dla rozpoznawania mowy');
    // Informuj użytkownika o trybie offline
    addMessage('system', 'Przechodzenie do trybu offline. Możesz użyć przycisków komend zamiast mowy.');
    
    // Wyświetl przyciski komend bardziej widocznie
    const commandButtons = document.querySelectorAll('.command-btn');
    commandButtons.forEach(btn => {
      btn.style.backgroundColor = '#50fa7b';
      btn.style.fontSize = '16px';
      btn.style.padding = '10px 15px';
      btn.style.margin = '5px';
    });
  }
  
  // Function to start audio recording with Web Speech API
  async function startRecording() {
    console.log('Rozpoczynanie nagrywania audio z Web Speech API');
    try {
      // Dodaj wiadomość o rozpoczęciu nasłuchiwania
      addMessage('system', 'Nasłuchiwanie... Mów teraz.');
      
      // Najpierw sprawdź, czy użytkownik ma uprawnienia do mikrofonu
      try {
        // Najpierw proś o uprawnienia do mikrofonu
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Jeśli jesteśmy tutaj, to znaczy, że uprawnienia zostały przyznane
        // Zatrzymaj strumień, ponieważ będziemy go używać w inny sposób
        stream.getTracks().forEach(track => track.stop());
        
        // Dodaj informację dla użytkownika
        addMessage('system', 'Dostęp do mikrofonu został przyznany. Rozpoczynam nasłuchiwanie...');
      } catch (permissionError) {
        console.error('Błąd uprawnień mikrofonu:', permissionError);
        addMessage('system', 'Brak dostępu do mikrofonu. Kliknij ikonkę kłódki w pasku adresu i zezwól na dostęp do mikrofonu.');
        
        // Dodaj przycisk do ponownego żądania uprawnień
        const permissionBtn = document.createElement('button');
        permissionBtn.textContent = 'Przyznaj dostęp do mikrofonu';
        permissionBtn.className = 'permission-button';
        permissionBtn.onclick = () => {
          // Usuń przycisk
          permissionBtn.remove();
          // Spróbuj ponownie
          startRecording();
        };
        document.getElementById('chat-history').appendChild(permissionBtn);
        return;
      }
      
      // Sprawdzenie czy przeglądarka obsługuje Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Web Speech API nie jest obsługiwana w tej przeglądarce');
        addMessage('system', 'Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj użyć Chrome lub Edge.');
        
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
            
            // Pokaż rozpoznany tekst w interfejsie
            addMessage('user', finalTranscript.trim());
            
            // Wyślij transkrypcję bezpośrednio do serwera przez Web Speech API
            const transcriptData = {
              transcript: finalTranscript.trim()
            };
            
            // Wysyłanie wyniku rozpoznawania mowy do serwera
            socket.emit('web-stt-result', transcriptData);
            
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
          // Nie pokazuj błędu użytkownikowi, po prostu kontynuuj nasłuchiwanie
        } else if (event.error === 'not-allowed') {
          addMessage('system', 'Brak dostępu do mikrofonu. Kliknij ikonkę kłódki w pasku adresu i zezwól na dostęp do mikrofonu.');
          
          // Dodaj przycisk do ponownego żądania uprawnień
          const permissionBtn = document.createElement('button');
          permissionBtn.textContent = 'Przyznaj dostęp do mikrofonu';
          permissionBtn.className = 'permission-button';
          permissionBtn.onclick = () => {
            // Usuń przycisk
            permissionBtn.remove();
            // Spróbuj ponownie
            startRecording();
          };
          document.getElementById('chat-history').appendChild(permissionBtn);
        } else if (event.error === 'network') {
          // Błąd sieci - spróbuj ponownie po krótkiej przerwie
          addMessage('system', 'Wystąpił problem z połączeniem sieciowym. Spróbuję ponownie za chwilę...');
          
          // Zatrzymaj obecne rozpoznawanie
          recognition.stop();
          
          // Spróbuj ponownie po krótkiej przerwie
          setTimeout(() => {
            console.log('Ponowna próba po błędzie sieci');
            // Spróbuj ponownie z normalnym trybem
            startRecording();
          }, 2000);
          
          return;
        } else {
          addMessage('system', `Błąd rozpoznawania mowy: ${event.error}`);
        }
      };
      
      // Obsługa zakończenia rozpoznawania
      recognition.onend = () => {
        console.log('Rozpoznawanie mowy zakończone');
        // Jeśli nadal powinniśmy nagrywać, uruchom ponownie
        if (isRecording) {
          try {
            recognition.start();
            console.log('Ponowne uruchomienie rozpoznawania mowy');
          } catch (e) {
            console.error('Błąd przy ponownym uruchomieniu rozpoznawania:', e);
          }
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
      addMessage('system', 'Błąd dostępu do mikrofonu. Sprawdź uprawnienia i odśwież stronę.');
      
      // Fallback do zwykłego nagrywania
      startFallbackRecording();
    }
  }
  
  // Fallback do zwykłego nagrywania audio (gdy Web Speech API nie jest dostępne)
  async function startFallbackRecording() {
    try {
      // Dodaj informację dla użytkownika
      addMessage('system', 'Próba uruchomienia trybu awaryjnego nagrywania...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      
      // Dodaj obsługę zatrzymania nagrywania, gdy strona jest zamykana
      window.addEventListener('beforeunload', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        }
      });
      
      // Obsługa dostępnych danych audio
      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Pokaż wizualną informację o nagrywaniu
          const volumeIndicator = document.getElementById('volume-indicator') || createVolumeIndicator();
          pulseVolumeIndicator(volumeIndicator);
          
          // Wyślij dane audio do serwera
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
      
      // Obsługa błędów
      mediaRecorder.addEventListener('error', error => {
        console.error('Błąd MediaRecorder:', error);
        addMessage('system', `Błąd nagrywania: ${error.message || 'Nieznany błąd'}`);
      });
      
      // Rozpocznij nagrywanie
      mediaRecorder.start(1000); // Nagrywaj w 1-sekundowych interwałach
      isRecording = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      console.log('Rozpoczęto nagrywanie w trybie awaryjnym');
      
      // Aktualizacja interfejsu
      addMessage('system', 'Mikrofon aktywny w trybie awaryjnym - mowa będzie rozpoznawana na serwerze');
    } catch (error) {
      console.error('Błąd dostępu do mikrofonu:', error);
      
      // Sprawdź rodzaj błędu
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        addMessage('system', 'Brak dostępu do mikrofonu. Kliknij ikonkę kłódki w pasku adresu i zezwól na dostęp do mikrofonu.');
        
        // Dodaj przycisk do ponownego żądania uprawnień
        const permissionBtn = document.createElement('button');
        permissionBtn.textContent = 'Przyznaj dostęp do mikrofonu';
        permissionBtn.className = 'permission-button';
        permissionBtn.onclick = () => {
          // Usuń przycisk
          permissionBtn.remove();
          // Spróbuj ponownie
          startFallbackRecording();
        };
        document.getElementById('chat-history').appendChild(permissionBtn);
      } else if (error.name === 'NotFoundError') {
        addMessage('system', 'Nie znaleziono urządzenia audio. Sprawdź, czy mikrofon jest podłączony.');
      } else {
        addMessage('system', `Błąd dostępu do mikrofonu: ${error.message || error.name || 'Nieznany błąd'}`);
      }
    }
  }
  
  // Funkcja tworząca wskaźnik głośności
  function createVolumeIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'volume-indicator';
    indicator.className = 'volume-indicator';
    document.getElementById('chat-history').appendChild(indicator);
    return indicator;
  }
  
  // Funkcja pulsująca wskaźnik głośności
  function pulseVolumeIndicator(indicator) {
    indicator.classList.add('pulse');
    setTimeout(() => {
      indicator.classList.remove('pulse');
    }, 200);
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
  
  // Funkcja do obsługi kliknięcia przycisku komendy
  function handleCommandButtonClick(event) {
    const command = event.target.getAttribute('data-command');
    if (command) {
      // Dodaj komendę do historii czatu jako wiadomość użytkownika
      addMessage('user', command);
      
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
      }, 2000);
    }
  }
  
  // Dodaj obsługę zdarzeń do przycisków komend
  const commandButtons = document.querySelectorAll('.command-btn');
  commandButtons.forEach(btn => {
    btn.addEventListener('click', handleCommandButtonClick);
  });
  
  // Add event listeners to buttons
  startBtn.addEventListener('click', () => {
    console.log('Przycisk Start kliknięty');
    startRecording();
  });
  
  stopBtn.addEventListener('click', () => {
    console.log('Przycisk Stop kliknięty');
    stopRecording();
  });
  
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

  // Obsługa odpowiedzi audio z serwera
  socket.on('audio-response', (audioData) => {
    try {
      // Konwersja danych binarnych na ArrayBuffer
      const buffer = new Uint8Array(audioData).buffer;
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      // Odtwarzanie dźwięku
      const audio = new Audio(url);
      audio.play();
      
      // Zwolnienie URL po zakończeniu odtwarzania
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Błąd odtwarzania audio:', error);
      addMessage('system', 'Błąd odtwarzania odpowiedzi głosowej');
    }
  });
  
  // Obsługa żądania Web TTS (synteza mowy w przeglądarce)
  socket.on('web-tts', (data) => {
    console.log('Otrzymano żądanie web-tts:', data);
    try {
      // Sprawdź, czy przeglądarka obsługuje Web Speech API - syntezę mowy
      if (!('speechSynthesis' in window)) {
        console.error('Web Speech API (synteza mowy) nie jest obsługiwana w tej przeglądarce');
        addMessage('system', 'Twoja przeglądarka nie obsługuje syntezy mowy. Używanie trybu awaryjnego.');
        return;
      }
      
      // Pobierz tekst do odczytania
      const text = data.text || data;
      console.log('Tekst do odczytania:', text);
      
      // Anuluj wszystkie poprzednie wypowiedzi
      window.speechSynthesis.cancel();
      
      // Utwórz nowy obiekt wypowiedzi
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Ustaw język na polski
      utterance.lang = 'pl-PL';
      
      // Opcjonalne ustawienia głosu
      utterance.rate = 1.0; // Prędkość mówienia (0.1 do 10)
      utterance.pitch = 1.0; // Wysokość głosu (0 do 2)
      utterance.volume = 1.0; // Głośność (0 do 1)
      
      // Pobierz dostępne głosy
      let voices = window.speechSynthesis.getVoices();
      console.log('Dostępne głosy:', voices.map(v => `${v.name} (${v.lang})`));
      
      // Jeśli lista głosów jest pusta, poczekaj na załadowanie głosów
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          console.log('Głosy załadowane:', voices.map(v => `${v.name} (${v.lang})`));
          
          // Spróbuj znaleźć polski głos
          const polishVoice = voices.find(voice => voice.lang.startsWith('pl'));
          if (polishVoice) {
            console.log('Znaleziono polski głos:', polishVoice.name);
            utterance.voice = polishVoice;
          }
          
          // Rozpocznij syntezę mowy
          window.speechSynthesis.speak(utterance);
        };
      } else {
        // Spróbuj znaleźć polski głos
        const polishVoice = voices.find(voice => voice.lang.startsWith('pl'));
        if (polishVoice) {
          console.log('Znaleziono polski głos:', polishVoice.name);
          utterance.voice = polishVoice;
        }
        
        // Obsługa zdarzeń
        utterance.onstart = () => {
          console.log('Rozpoczęto syntezę mowy');
        };
        
        utterance.onend = () => {
          console.log('Zakończono syntezę mowy');
        };
        
        utterance.onerror = (event) => {
          console.error('Błąd syntezy mowy:', event);
          addMessage('system', 'Błąd syntezy mowy. Spróbuj odświeżyć stronę.');
        };
        
        // Rozpocznij syntezę mowy
        console.log('Rozpoczynam syntezę mowy...');
        window.speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.error('Błąd syntezy mowy:', error);
      addMessage('system', 'Błąd syntezy mowy. Spróbuj odświeżyć stronę.');
    }
  });
  
  // Obsługa żądania użycia Web Speech API
  socket.on('web-stt-request', () => {
    try {
      // Sprawdź, czy przeglądarka obsługuje Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Web Speech API nie jest obsługiwana w tej przeglądarce');
        addMessage('system', 'Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj użyć Chrome.');
        return;
      }
      
      // Jeśli nagrywanie nie jest aktywne, uruchom je
      if (!isRecording) {
        startRecording();
      }
    } catch (error) {
      console.error('Błąd uruchamiania Web Speech API:', error);
      addMessage('system', 'Błąd uruchamiania rozpoznawania mowy. Spróbuj odświeżyć stronę.');
    }
  });
  
  // Initialize the app
  initCamera();
  setupNoVNC();
  
  // Auto-start audio recording when the app loads
  setTimeout(() => {
    startRecording();
  }, 1500); // Short delay to ensure everything is loaded
});
