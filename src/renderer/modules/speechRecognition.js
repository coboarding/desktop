/**
 * Moduł obsługujący rozpoznawanie mowy
 */

// Zmienne globalne
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let isOfflineMode = false;

/**
 * Inicjalizacja Web Speech API
 */
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Web Speech API nie jest obsługiwane w tej przeglądarce');
    return false;
  }
  
  console.log('Web Speech API dostępne, inicjalizacja...');
  return true;
}

/**
 * Przejście do trybu offline dla rozpoznawania mowy
 */
function handleOfflineMode() {
  // Jeśli już jesteśmy w trybie offline, nie rób nic
  if (isOfflineMode) {
    console.log('Już jesteśmy w trybie offline, pomijam');
    return;
  }
  
  // Ustaw flagę trybu offline
  isOfflineMode = true;
  
  console.log('Przechodzenie do trybu offline dla rozpoznawania mowy');
  // Informuj użytkownika o trybie offline
  window.addMessage('system', 'Przechodzenie do trybu offline. Możesz użyć przycisków komend zamiast mowy.');
  
  // Zatrzymaj wszystkie próby rozpoznawania mowy
  if (window.currentRecognition) {
    try {
      window.currentRecognition.abort();
      window.currentRecognition = null;
    } catch (error) {
      console.error('Błąd zatrzymywania rozpoznawania mowy:', error);
    }
  }
  
  // Wyświetl przyciski komend bardziej widocznie
  const commandButtons = document.querySelectorAll('.command-btn');
  commandButtons.forEach(btn => {
    btn.style.backgroundColor = '#50fa7b';
    btn.style.fontSize = '16px';
    btn.style.padding = '10px 15px';
    btn.style.margin = '5px';
  });
}

/**
 * Rozpoczęcie nagrywania audio z Web Speech API
 */
async function startRecording() {
  console.log('Rozpoczynanie nagrywania audio z Web Speech API');
  try {
    // Dodaj wiadomość o rozpoczęciu nasłuchiwania
    window.addMessage('system', 'Nasłuchiwanie... Mów teraz.');
    
    // Sprawdź, czy Web Speech API jest dostępne
    if (!initSpeechRecognition()) {
      // Fallback do zwykłego nagrywania audio
      startFallbackRecording();
      return;
    }
    
    // Sprawdź, czy mamy dostęp do mikrofonu
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Dostęp do mikrofonu przyznany');
      window.addMessage('system', 'Dostęp do mikrofonu został przyznany. Rozpoczynam nasłuchiwanie...');
      
      // Inicjalizacja Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Zapisz referencję do obiektu rozpoznawania mowy globalnie, aby można było go zatrzymać i uruchomić ponownie
      window.currentRecognition = recognition;
      
      // Konfiguracja
      recognition.lang = 'pl-PL';
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // Obsługa wyników rozpoznawania
      recognition.onresult = (event) => {
        const interimElement = document.getElementById('interim-text');
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Przetwarzanie wyników
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Wyświetl tymczasową transkrypcję
        if (interimElement) {
          interimElement.textContent = interimTranscript;
        }
        
        // Jeśli mamy finalną transkrypcję, wyślij ją
        if (finalTranscript) {
          // Wyczyść tymczasową transkrypcję
          if (interimElement) {
            interimElement.textContent = '';
          }
          
          // Dodaj transkrypcję do czatu
          window.addMessage('user', finalTranscript);
          
          // Sprawdź, czy to komenda przeglądarki
          if (window.checkForBrowserCommand) {
            const browserCommand = window.checkForBrowserCommand(finalTranscript);
            if (browserCommand) {
              console.log('Wykryto komendę przeglądarki:', browserCommand);
              
              // Wykonaj komendę przeglądarki
              if (window.executeBrowserCommand) {
                window.executeBrowserCommand(browserCommand);
                return; // Nie wysyłaj transkrypcji do serwera, jeśli to komenda przeglądarki
              }
            }
          }
          
          // Wyślij transkrypcję do serwera
          console.log('Wysyłanie transkrypcji do serwera:', finalTranscript);
          window.socket.emit('web-stt-result', { transcript: finalTranscript });
        }
      };
      
      // Obsługa błędów
      recognition.onerror = (event) => {
        console.error('Błąd rozpoznawania mowy:', event.error);
        
        // Jeśli już jesteśmy w trybie offline, ignoruj wszystkie błędy
        if (isOfflineMode) {
          console.log('Jesteśmy w trybie offline, ignoruję błąd:', event.error);
          return;
        }
        
        // Obsługa różnych typów błędów
        switch (event.error) {
          case 'no-speech':
            console.log('Nie wykryto mowy');
            // Nie pokazuj błędu użytkownikowi, po prostu kontynuuj nasłuchiwanie
            break;
            
          case 'not-allowed':
            window.addMessage('system', 'Brak dostępu do mikrofonu. Kliknij ikonkę kłódki w pasku adresu i zezwól na dostęp do mikrofonu.');
            
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
            break;
            
          case 'network':
          case 'aborted':
          case 'audio-capture':
          case 'service-not-allowed':
            // Wszystkie te błędy powinny spowodować przejście do trybu offline
            console.log(`Błąd ${event.error} w rozpoznawaniu mowy - przechodzenie do trybu offline`);
            
            // Poinformuj użytkownika tylko raz
            if (!isOfflineMode) {
              window.addMessage('system', 'Wystąpił problem z rozpoznawaniem mowy. Przechodzenie do trybu offline...');
              
              // Przejdź do trybu offline
              handleOfflineMode();
            }
            break;
            
          default:
            // Dla innych błędów tylko informuj użytkownika
            if (!isOfflineMode) {
              window.addMessage('system', `Wystąpił błąd rozpoznawania mowy. Spróbuj użyć przycisków komend.`);
            }
            break;
        }
      };
      
      // Obsługa zakończenia rozpoznawania
      recognition.onend = () => {
        console.log('Rozpoznawanie mowy zakończone');
        
        // Jeśli jesteśmy w trybie offline, nie próbuj ponownie uruchamiać rozpoznawania
        if (isOfflineMode) {
          console.log('Tryb offline aktywny, nie uruchamiam ponownie rozpoznawania mowy');
          return;
        }
        
        // Jeśli nadal powinniśmy nagrywać, uruchom ponownie
        if (isRecording) {
          try {
            recognition.start();
            console.log('Ponowne uruchomienie rozpoznawania mowy');
          } catch (e) {
            console.error('Błąd ponownego uruchamiania rozpoznawania mowy:', e);
            
            // Jeśli błąd wskazuje na problem z mikrofonem lub usługą, przejdź do trybu offline
            if (!isOfflineMode) {
              console.log('Przechodzenie do trybu offline po błędzie ponownego uruchamiania');
              handleOfflineMode();
              return;
            }
            
            // Spróbuj ponownie po krótkiej przerwie tylko jeśli nie jesteśmy w trybie offline
            setTimeout(() => {
              if (!isOfflineMode && isRecording) {
                try {
                  recognition.start();
                  console.log('Ponowna próba uruchomienia rozpoznawania mowy po błędzie');
                } catch (error) {
                  console.error('Nie można uruchomić rozpoznawania mowy:', error);
                  window.addMessage('system', 'Wystąpił problem z rozpoznawaniem mowy. Przechodzenie do trybu offline...');
                  handleOfflineMode();
                }
              }
            }, 1000);
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
      document.getElementById('start-btn').disabled = true;
      document.getElementById('stop-btn').disabled = false;
      
      // Dodaj wskaźnik głośności
      const volumeIndicator = window.createVolumeIndicator();
      document.getElementById('user-video-placeholder').appendChild(volumeIndicator);
      
      // Animuj wskaźnik głośności
      window.pulseVolumeIndicator(volumeIndicator);
      
      // Informuj użytkownika o aktywnym mikrofonie
      window.addMessage('system', 'Mikrofon aktywny - mów wyraźnie po polsku');
      
      // Zwolnij strumień audio
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Błąd dostępu do mikrofonu:', error);
      window.addMessage('system', 'Brak dostępu do mikrofonu. Upewnij się, że przeglądarka ma uprawnienia do korzystania z mikrofonu.');
      
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
    }
  } catch (error) {
    console.error('Błąd inicjalizacji nagrywania:', error);
    window.addMessage('system', 'Wystąpił błąd podczas inicjalizacji nagrywania. Spróbuj ponownie.');
  }
}

/**
 * Fallback do zwykłego nagrywania audio (gdy Web Speech API nie jest dostępne)
 */
async function startFallbackRecording() {
  console.log('Rozpoczynanie nagrywania audio (fallback)');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Dostęp do mikrofonu przyznany (fallback)');
    
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      // Wyślij audio do serwera
      fetch('/api/stt', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.transcript) {
          window.addMessage('user', data.transcript);
          window.socket.emit('web-stt-result', { transcript: data.transcript });
        } else {
          console.error('Brak transkrypcji w odpowiedzi');
          window.addMessage('system', 'Nie udało się rozpoznać mowy. Spróbuj ponownie.');
        }
      })
      .catch(error => {
        console.error('Błąd wysyłania audio do serwera:', error);
        window.addMessage('system', 'Wystąpił błąd podczas przetwarzania audio. Spróbuj ponownie.');
      });
      
      // Jeśli nadal nagrywamy, uruchom ponownie
      if (isRecording) {
        startFallbackRecording();
      }
    };
    
    // Rozpocznij nagrywanie
    mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, 5000); // Nagrywaj przez 5 sekund
    
    isRecording = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    
    // Dodaj wskaźnik głośności
    const volumeIndicator = window.createVolumeIndicator();
    document.getElementById('user-video-placeholder').appendChild(volumeIndicator);
    
    // Animuj wskaźnik głośności
    window.pulseVolumeIndicator(volumeIndicator);
    
    window.addMessage('system', 'Mikrofon aktywny (tryb fallback) - mów wyraźnie po polsku');
  } catch (error) {
    console.error('Błąd dostępu do mikrofonu (fallback):', error);
    window.addMessage('system', 'Brak dostępu do mikrofonu. Upewnij się, że przeglądarka ma uprawnienia do korzystania z mikrofonu.');
  }
}

/**
 * Zatrzymanie nagrywania
 */
function stopRecording() {
  console.log('Zatrzymywanie nagrywania audio');
  
  isRecording = false;
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  
  // Usuń wskaźnik głośności
  const volumeIndicator = document.querySelector('.volume-indicator');
  if (volumeIndicator) {
    volumeIndicator.remove();
  }
  
  // Zatrzymaj Web Speech API
  if (window.speechRecognition) {
    try {
      window.speechRecognition.stop();
      console.log('Zatrzymano Web Speech API');
    } catch (error) {
      console.error('Błąd zatrzymywania Web Speech API:', error);
    }
  }
  
  // Zatrzymaj fallback
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try {
      mediaRecorder.stop();
      console.log('Zatrzymano fallback nagrywanie');
    } catch (error) {
      console.error('Błąd zatrzymywania fallback nagrywania:', error);
    }
  }
  
  window.addMessage('system', 'Nagrywanie zatrzymane');
}

// Eksportuj funkcje
export {
  initSpeechRecognition,
  handleOfflineMode,
  startRecording,
  startFallbackRecording,
  stopRecording,
  isOfflineMode
};
