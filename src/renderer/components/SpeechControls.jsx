import React from 'react';

function SpeechControls({ 
  isListening, 
  isSpeaking, 
  webSpeechActive, 
  onStartListening, 
  onStartWebSpeech 
}) {
  return (
    <div className="speech-controls">
      <h3>Sterowanie mową</h3>
      <div className="speech-buttons">
        <button 
          className={`mic-button ${isListening ? 'active' : ''}`}
          onClick={onStartListening}
          title="Start/Stop nagrywania"
        >
          {isListening ? 'Stop' : 'Start'}
        </button>
        
        <div className="speech-status">
          {isListening && <div className="status-indicator listening">Słucham...</div>}
          {isSpeaking && <div className="status-indicator speaking">Mówię...</div>}
          {webSpeechActive && <div className="status-indicator webspeech">Web Speech aktywny</div>}
        </div>
      </div>
    </div>
  );
}

export default SpeechControls;
