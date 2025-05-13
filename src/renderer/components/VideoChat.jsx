import React, { useRef, useEffect, useState } from 'react';
import AsciiAnimation from './AsciiAnimation';

function VideoChat({ isListening, isSpeaking, webSpeechActive, latestMessage }) {
  const videoRef = useRef(null);
  const [botState, setBotState] = useState('idle');

  // Inicjalizacja kamery
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Błąd podczas inicjalizacji kamery:', error);
      }
    };

    startCamera();

    // Czyszczenie po odmontowaniu komponentu
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Aktualizacja stanu bota na podstawie stanu słuchania i mówienia
  useEffect(() => {
    if (isSpeaking) {
      setBotState('talking');
    } else if (isListening || webSpeechActive) {
      setBotState('listening');
    } else {
      setBotState('idle');
    }
  }, [isListening, isSpeaking, webSpeechActive]);

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
      
      {/* Sekcja czatu */}
      <div className="chat-section">
        <div className="message-container">
          {latestMessage && (
            <div className={`message ${latestMessage.type}`}>
              {latestMessage.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoChat;