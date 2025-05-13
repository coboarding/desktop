import React from 'react';

function SpeechControls({ 
  isListening, 
  isSpeaking, 
  webSpeechActive, 
  onStartListening, 
  onStartWebSpeech 
}) {
  // Obsługa kliknięcia przycisku mikrofonu
  const handleMicButtonClick = () => {
    if (isListening || isSpeaking || webSpeechActive) {
      return; // Nie rób nic, jeśli już słuchamy lub mówimy
    }
    
    // Sprawdź, czy Web Speech API jest dostępne
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('Używam Web Speech API');
      if (typeof onStartWebSpeech === 'function') {
        onStartWebSpeech();
      }
    } else {
      console.log('Web Speech API niedostępne, używam standardowego mikrofonu');
      if (typeof onStartListening === 'function') {
        onStartListening();
      }
    }
  };

  return (
    <div className="speech-controls">
      <button 
        className="mic-button"
        onClick={handleMicButtonClick}
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
  );
}

export default SpeechControls;
