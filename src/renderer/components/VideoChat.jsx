import React, { useRef, useEffect, useState } from 'react';
import AsciiAnimation from './AsciiAnimation';

function VideoChat({ isListening, isSpeaking, webSpeechActive, onStartListening, onStartWebSpeech, latestMessage }) {
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

  // Aktualizacja stanu bota na podstawie isListening, isSpeaking i webSpeechActive
  useEffect(() => {
    if (isListening || webSpeechActive) {
      setBotState('listening');
    } else if (isSpeaking) {
      setBotState('talking');
    } else {
      setBotState('idle');
    }
  }, [isListening, isSpeaking, webSpeechActive]);

  // Automatyczne rozpoczęcie konwersacji
  useEffect(() => {
    // Opóźnienie, aby dać czas na ładowanie
    const timer = setTimeout(() => {
      if (!isListening && !isSpeaking && !webSpeechActive) {
        // Automatyczne rozpoczęcie nasłuchiwania po otrzymaniu odpowiedzi od asystenta
        if (latestMessage && latestMessage.type === 'assistant') {
          setTimeout(() => {
            // Preferuj Web Speech API, jeśli jest dostępne
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
              onStartWebSpeech();
            } else {
              onStartListening();
            }
          }, 1000);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isListening, isSpeaking, webSpeechActive, latestMessage, onStartListening, onStartWebSpeech]);

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
          onClick={onStartWebSpeech || onStartListening}
          disabled={isListening || isSpeaking || webSpeechActive}
        >
          <span className="mic-icon">🎤</span>
          {isListening || webSpeechActive ? 'Słucham...' : 'Naciśnij, aby mówić'}
          {(isListening || webSpeechActive) && <div className="listening-indicator"></div>}
        </button>
        <div className="speech-status">
          {webSpeechActive && <span className="web-speech-badge">Web Speech API</span>}
          {isListening && !webSpeechActive && <span className="web-speech-badge">Mikrofon</span>}
          {isSpeaking && <span className="web-speech-badge speaking">Mówię...</span>}
        </div>
      </div>
    </div>
  );
}

export default VideoChat;