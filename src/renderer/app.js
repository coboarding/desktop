import React, { useEffect, useState, useRef } from 'react';
import VideoChat from './components/VideoChat';
import ChatHistory from './components/ChatHistory';
import Settings from './components/Settings';

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
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

  // Przekaż konfigurację do ustawień, jeśli użytkownik ustawi przez chat lub GUI
  const handleRTSPConfig = (config) => {
    setRtspConfig(config);
    setChatHistory(prev => [...prev, { type: 'assistant', text: 'Konfiguracja RTSP została zapisana.' }]);
  };

  return (
    <div className="app-container">
      <div className="tabs">
        <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'active' : ''}>VideoChat</button>
        <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'active' : ''}>Historia</button>
        <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active' : ''}>Ustawienia</button>
      </div>
      {activeTab === 'chat' && (
        <VideoChat
          isListening={isListening}
          isSpeaking={isSpeaking}
          onStartListening={startListening}
          latestMessage={chatHistory[chatHistory.length - 1]}
        />
      )}
      {activeTab === 'history' && (
        <ChatHistory messages={chatHistory} />
      )}
      {activeTab === 'settings' && (
        <Settings rtspConfig={rtspConfig} onRTSPConfigChange={handleRTSPConfig} />
      )}
    </div>
  );
}

export default App;