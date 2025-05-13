import React, { useRef, useEffect, useState } from 'react';
import AsciiAnimation from './AsciiAnimation';

function VideoChat({ isListening, isSpeaking, onStartListening, latestMessage }) {
  const [botState, setBotState] = useState('idle');
  const videoRef = useRef(null);

  // Inicjalizacja kamery dla użytkownika
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false  // Audio obsługiwane oddzielnie
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Błąd podczas inicjalizacji kamery:', error);
      }
    };

    initCamera();

    // Czyszczenie przy odmontowaniu
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Aktualizacja stanu bota na podstawie isListening i isSpeaking
  useEffect(() => {
    if (isListening) {
      setBotState('listening');
    } else if (isSpeaking) {
      setBotState('talking');
    } else {
      setBotState('idle');
    }
  }, [isListening, isSpeaking]);

  // Automatyczne rozpoczęcie konwersacji
  useEffect(() => {
    // Opóźnienie, aby dać czas na ładowanie
    const timer = setTimeout(() => {
      if (!isListening && !isSpeaking) {
        // Automatyczne rozpoczęcie nasłuchiwania po otrzymaniu odpowiedzi od asystenta
        if (latestMessage && latestMessage.type === 'assistant') {
          setTimeout(onStartListening, 1000);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isListening, isSpeaking, latestMessage, onStartListening]);

  return (
    <div className="video-chat-container">
      <div className="video-grid">
        {/* Lewa strona - wideo użytkownika */}
        <div className="user-video-container">
          <h3>Ty</h3>
          <div className="video-frame">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
          </div>
        </div>

        {/* Prawa strona - animacja ASCII bota */}
        <div className="bot-video-container">
          <h3>Asystent AI</h3>
          <div className="ascii-frame">
            <AsciiAnimation
              animationType={botState}
              width={480}
              height={360}
            />
          </div>
        </div>
      </div>
      
      <div className="message-container">
        {latestMessage && (
          <div className={`message ${latestMessage.type}`}>
            {latestMessage.text}
          </div>
        )}
      </div>
      
      <div className="controls">
        <button 
          className="mic-button"
          onClick={onStartListening}
          disabled={isListening || isSpeaking}
        >
          <span className="mic-icon">🎤</span>
          {isListening ? 'Słucham...' : 'Naciśnij, aby mówić'}
        </button>
      </div>
    </div>
  );
}

export default VideoChat;