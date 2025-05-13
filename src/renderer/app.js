import React, { useEffect, useState, useRef } from 'react';
import VideoChat from './components/VideoChat';
import ChatHistory from './components/ChatHistory';
import Settings from './components/Settings';
import SpeechControls from './components/SpeechControls';
import BotCommands from './components/BotCommands';

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [webSpeechActive, setWebSpeechActive] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [rtspConfig, setRtspConfig] = useState(null);

  const socket = useRef(null);
  const audioContext = useRef(null);
  const audioRecorder = useRef(null);
  const audioPlayer = useRef(null);

  // Inicjalizacja Socket.IO
  useEffect(() => {
    // Połączenie z serwerem Socket.IO
    socket.current = io();

    // Inicjalizacja kontekstu audio
    audioContext.current = new (window.AudioContext || window.webkitAudioContext)();

    // Utworzenie odtwarzacza audio
    audioPlayer.current = new Audio();

    // Nasłuchiwanie na transkrypcje
    socket.current.on('transcription', (data) => {
      if (data.user) {
        setChatHistory(prev => [...prev, { type: 'user', text: data.user }]);
      }

      if (data.assistant) {
        setChatHistory(prev => [...prev, { type: 'assistant', text: data.assistant }]);
        
        // Automatycznie odczytaj odpowiedź asystenta za pomocą TTS
        if ('speechSynthesis' in window) {
          try {
            // Zatrzymaj wszystkie poprzednie wypowiedzi
            window.speechSynthesis.cancel();
            
            const utter = new window.SpeechSynthesisUtterance(data.assistant);
            utter.lang = 'pl-PL';
            utter.volume = 1.0;
            utter.rate = 1.0;
            utter.pitch = 1.0;
            
            console.log('Automatyczne odczytywanie odpowiedzi asystenta:', data.assistant);
            
            setIsSpeaking(true);
            
            utter.onend = () => {
              console.log('Zakończono syntezę mowy');
              setIsSpeaking(false);
              
              // Automatycznie uruchom rozpoznawanie mowy po zakończeniu wypowiedzi
              setTimeout(() => {
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                  startWebSpeechRecognition();
                } else {
                  startListening();
                }
              }, 500);
            };
            
            utter.onerror = (event) => {
              console.error('Błąd syntezy mowy:', event);
              setIsSpeaking(false);
            };
            
            window.speechSynthesis.speak(utter);
          } catch (error) {
            console.error('Błąd podczas inicjalizacji syntezy mowy:', error);
            setIsSpeaking(false);
          }
        }
      }
    });

    // Nasłuchiwanie na odpowiedzi audio
    socket.current.on('audio-response', (audioData) => {
      playAudioResponse(audioData);
    });

    // Nasłuchiwanie na web-tts (tekst do odczytania przez przeglądarkę)
    socket.current.on('web-tts', (data) => {
      console.log('Otrzymano zdarzenie web-tts:', data);
      if ('speechSynthesis' in window) {
        try {
          // Zatrzymaj wszystkie poprzednie wypowiedzi
          window.speechSynthesis.cancel();
          
          const utter = new window.SpeechSynthesisUtterance(data.text);
          utter.lang = data.options?.lang || 'pl-PL';
          utter.volume = data.options?.volume || 1.0;
          utter.rate = data.options?.rate || 1.0;
          utter.pitch = data.options?.pitch || 1.0;
          
          console.log('Konfiguracja syntezy mowy:', {
            text: data.text,
            lang: utter.lang,
            volume: utter.volume,
            rate: utter.rate,
            pitch: utter.pitch
          });
          
          setIsSpeaking(true);
          
          utter.onend = () => {
            console.log('Zakończono syntezę mowy');
            setIsSpeaking(false);
          };
          
          utter.onerror = (event) => {
            console.error('Błąd syntezy mowy:', event);
            setIsSpeaking(false);
          };
          
          window.speechSynthesis.speak(utter);
        } catch (error) {
          console.error('Błąd podczas inicjalizacji syntezy mowy:', error);
          setIsSpeaking(false);
        }
      } else {
        console.error('Web Speech API (synteza) nie jest dostępne w tej przeglądarce');
      }
    });

    // Nasłuchiwanie na web-stt-request (prośba o użycie Web Speech API do transkrypcji)
    socket.current.on('web-stt-request', () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'pl-PL';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        setWebSpeechActive(true);
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          // Wysyłamy transkrypcję do serwera
          socket.current.emit('web-stt-result', {
            transcript: transcript
          });
        };
        
        recognition.onend = () => {
          setWebSpeechActive(false);
        };
        
        recognition.onerror = () => {
          setWebSpeechActive(false);
        };
        
        recognition.start();
      }
    });

    // Obsługa komend bota
    const handleBotCommand = (event) => {
      const { command } = event.detail;
      console.log('Otrzymano komendę bota:', command);
      
      // Dodaj komendę do historii czatu jako wiadomość użytkownika
      setChatHistory(prev => [...prev, { type: 'user', text: command }]);
      
      // Wyślij komendę do serwera
      if (socket.current) {
        socket.current.emit('message', { text: command });
      }
    };
    
    // Nasłuchuj na zdarzenia komend bota
    window.addEventListener('bot-command', handleBotCommand);

    // Czyszczenie przy odmontowaniu
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
      }
      window.removeEventListener('bot-command', handleBotCommand);
    };
  }, []);

  // Funkcja do wykrywania próby konfiguracji RTSP przez chat
  useEffect(() => {
    if (chatHistory.length === 0) return;
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg.type === 'user') {
      // Prosta heurystyka: jeśli użytkownik pisze o RTSP, poproś o dane
      if (/rtsp|kamera|stream|wideo|video|adres/i.test(lastMsg.text)) {
        if (!rtspConfig || !rtspConfig.rtspUrl) {
          setChatHistory(prev => [...prev, {
            type: 'assistant',
            text: 'Podaj adres RTSP streamu (np. rtsp://adres:port/ścieżka):'
          }]);
        } else if (!rtspConfig.username) {
          setChatHistory(prev => [...prev, {
            type: 'assistant',
            text: 'Podaj nazwę użytkownika do streamu (jeśli wymagana, w przeciwnym razie napisz "brak"):'
          }]);
        } else if (!rtspConfig.password) {
          setChatHistory(prev => [...prev, {
            type: 'assistant',
            text: 'Podaj hasło do streamu (jeśli wymagane, w przeciwnym razie napisz "brak"):'
          }]);
        }
      }
      // Automatyczne przechwytywanie odpowiedzi użytkownika
      if (rtspConfig && !rtspConfig.rtspUrl && /^rtsp:\/\//i.test(lastMsg.text)) {
        setRtspConfig({ ...rtspConfig, rtspUrl: lastMsg.text });
        setChatHistory(prev => [...prev, { type: 'assistant', text: 'Podaj nazwę użytkownika do streamu (jeśli wymagana, w przeciwnym razie napisz "brak"):' }]);
      } else if (rtspConfig && rtspConfig.rtspUrl && !rtspConfig.username && lastMsg.text.length < 32) {
        setRtspConfig({ ...rtspConfig, username: lastMsg.text === 'brak' ? '' : lastMsg.text });
        setChatHistory(prev => [...prev, { type: 'assistant', text: 'Podaj hasło do streamu (jeśli wymagane, w przeciwnym razie napisz "brak"):' }]);
      } else if (rtspConfig && rtspConfig.rtspUrl && rtspConfig.username !== undefined && !rtspConfig.password && lastMsg.text.length < 64) {
        setRtspConfig({ ...rtspConfig, password: lastMsg.text === 'brak' ? '' : lastMsg.text });
        setChatHistory(prev => [...prev, { type: 'assistant', text: 'Konfiguracja RTSP została zapisana.' }]);
      }
    }
  }, [chatHistory]);

  // Automatyczne uruchamianie nasłuchiwania audio po starcie aplikacji
  useEffect(() => {
    // Krótkie opóźnienie, aby dać czas na załadowanie komponentów
    const timer = setTimeout(() => {
      // Preferuj Web Speech API, jeśli jest dostępne
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        console.log('Automatyczne uruchamianie Web Speech API po starcie');
        startWebSpeechRecognition();
      } else {
        console.log('Automatyczne uruchamianie mikrofonu po starcie');
        startListening();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Automatyczna wiadomość głosowa od bota po starcie aplikacji
  useEffect(() => {
    // Poczekaj aż mikrofon się uruchomi i odtwórz powitanie
    const timer = setTimeout(() => {
      const welcomeMsg = 'Witaj! Jestem Twoim asystentem. Możesz od razu zadawać pytania głosowo.';
      setChatHistory(prev => [...prev, { type: 'assistant', text: welcomeMsg }]);
      // Odtwarzanie głosowe (TTS)
      if ('speechSynthesis' in window) {
        const utter = new window.SpeechSynthesisUtterance(welcomeMsg);
        utter.lang = 'pl-PL';
        setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Inicjalizacja nagrywania głosu
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Konfiguracja rekordera
      const mediaRecorder = new MediaRecorder(stream);
      audioRecorder.current = mediaRecorder;

      let audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = [];

        // Konwersja Blob na ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Wysłanie danych audio do serwera
        socket.current.emit('audio-data', new Uint8Array(arrayBuffer));
      };

      // Rozpoczęcie nagrywania
      mediaRecorder.start();
      setIsListening(true);

      // Automatyczne zatrzymanie po 5 sekundach (lub innym czasie)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 5000);
    } catch (error) {
      console.error('Błąd podczas inicjalizacji mikrofonu:', error);
      
      // Fallback do Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        startWebSpeechRecognition();
      }
    }
  };

  // Funkcja do uruchamiania Web Speech API
  const startWebSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'pl-PL';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      setWebSpeechActive(true);
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Wysyłamy transkrypcję do serwera
        socket.current.emit('web-stt-result', {
          transcript: transcript
        });
      };
      
      recognition.onend = () => {
        setWebSpeechActive(false);
      };
      
      recognition.onerror = (error) => {
        console.error('Błąd rozpoznawania mowy:', error);
        setWebSpeechActive(false);
      };
      
      try {
        recognition.start();
        console.log('Rozpoczęto rozpoznawanie mowy przez Web Speech API');
      } catch (error) {
        console.error('Błąd podczas uruchamiania rozpoznawania mowy:', error);
        setWebSpeechActive(false);
      }
    } else {
      console.error('Web Speech API nie jest dostępne w tej przeglądarce');
    }
  };

  // Odtwarzanie odpowiedzi audio
  const playAudioResponse = (audioData) => {
    try {
      setIsSpeaking(true);

      // Konwersja danych binarnych na URL
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      // Ustawienie źródła dla odtwarzacza
      audioPlayer.current.src = url;

      // Odtwarzanie
      audioPlayer.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      audioPlayer.current.play().catch(error => {
        console.error('Błąd odtwarzania audio:', error);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('Błąd podczas przetwarzania odpowiedzi audio:', error);
      setIsSpeaking(false);
    }
  };

  // Zmiana aktywnej zakładki
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Pobranie ostatniej wiadomości dla VideoChat
  const getLatestMessage = () => {
    if (chatHistory.length === 0) return null;
    return chatHistory[chatHistory.length - 1];
  };

  return (
    <div className="app-container">
      <div className="top-section">
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={activeTab === 'chat' ? 'active' : ''} 
              onClick={() => handleTabChange('chat')}
            >
              Czat
            </button>
            <button 
              className={activeTab === 'history' ? 'active' : ''} 
              onClick={() => handleTabChange('history')}
            >
              Historia
            </button>
            <button 
              className={activeTab === 'settings' ? 'active' : ''} 
              onClick={() => handleTabChange('settings')}
            >
              Ustawienia
            </button>
          </div>
        </div>
        
        {/* Panel kontrolny - zawsze widoczny w prawym górnym rogu */}
        <div className="control-panel">
          <SpeechControls
            isListening={isListening}
            isSpeaking={isSpeaking}
            webSpeechActive={webSpeechActive}
            onStartListening={startListening}
            onStartWebSpeech={startWebSpeechRecognition}
          />
          <BotCommands />
        </div>
      </div>
      
      <div className="tab-content">
        {activeTab === 'chat' && (
          <VideoChat 
            isListening={isListening} 
            isSpeaking={isSpeaking}
            webSpeechActive={webSpeechActive}
            latestMessage={getLatestMessage()}
          />
        )}
        
        {activeTab === 'history' && (
          <ChatHistory 
            messages={chatHistory}
          />
        )}
        
        {activeTab === 'settings' && (
          <Settings 
            rtspConfig={rtspConfig}
            setRtspConfig={setRtspConfig}
          />
        )}
      </div>
    </div>
  );
}

export default App;