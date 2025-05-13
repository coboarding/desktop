import React, { useEffect, useState, useRef } from 'react';
import VideoChat from './components/VideoChat';
import ChatHistory from './components/ChatHistory';
import Settings from './components/Settings';

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
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
      }
    });
    
    // Nasłuchiwanie na odpowiedzi audio
    socket.current.on('audio-response', (audioData) => {
      playAudioResponse(audioData);
    });
    
    // Czyszczenie przy odmontowaniu
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
      }
    };
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
      console.error('Błąd podczas próby nagrywania audio:', error);
      setIsListening(false);

      // Symulacja wysłania danych audio w trybie demonstracyjnym
      if (process.env.NODE_ENV === 'development') {
        console.log('Symulacja wysłania danych audio...');
        // Wysyłamy puste dane, backend i tak zwróci symulowaną odpowiedź
        socket.current.emit('audio-data', new Uint8Array(10));
      }
    }
  };

  // Odtwarzanie odpowiedzi audio
  const playAudioResponse = async (audioData) => {
    try {
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      audioPlayer.current.src = url;
      setIsSpeaking(true);

      audioPlayer.current.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };

      await audioPlayer.current.play();
    } catch (error) {
      console.error('Błąd odtwarzania audio:', error);
      setIsSpeaking(false);

      // W przypadku błędu odtwarzania, symulujemy zakończenie mówienia po 2 sekundach
      setTimeout(() => {
        setIsSpeaking(false);
      }, 2000);
    }
  };
  
  return (
    <div className="app-container">
      <div className="tabs">
        <button 
          className={activeTab === 'chat' ? 'active' : ''} 
          onClick={() => setActiveTab('chat')}
        >
          VideoChat
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''} 
          onClick={() => setActiveTab('history')}
        >
          Historia
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
        >
          Ustawienia
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'chat' && (
          <VideoChat 
            isListening={isListening}
            isSpeaking={isSpeaking}
            onStartListening={startListening}
            latestMessage={chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null}
          />
        )}
        
        {activeTab === 'history' && (
          <ChatHistory 
            messages={chatHistory}
          />
        )}
        
        {activeTab === 'settings' && (
          <Settings />
        )}
      </div>
    </div>
  );
}

export default App;