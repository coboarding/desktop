/**
 * Moduł obsługujący syntezę mowy (TTS)
 */

/**
 * Inicjalizacja Web Speech API dla syntezy mowy
 */
function initSpeechSynthesis() {
  if (!('speechSynthesis' in window)) {
    console.error('Web Speech API (synteza mowy) nie jest obsługiwana w tej przeglądarce');
    return false;
  }
  
  console.log('Web Speech API (synteza mowy) dostępne, inicjalizacja głosów...');
  
  // Wczytaj głosy - to może trwać chwilę
  window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log(`Załadowano ${voices.length} głosów:`, voices.map(v => `${v.name} (${v.lang})`));
  };
  
  // Wywołaj getVoices, aby rozpocząć ładowanie
  window.speechSynthesis.getVoices();
  
  return true;
}

/**
 * Synteza mowy z użyciem Web Speech API
 * @param {string} text - Tekst do syntezy
 * @param {Object} options - Opcje syntezy (lang, volume, rate, pitch)
 */
function speakText(text, options = {}) {
  if (!('speechSynthesis' in window)) {
    console.error('Web Speech API (synteza mowy) nie jest obsługiwana w tej przeglądarce');
    return false;
  }
  
  // Domyślne opcje
  const defaultOptions = {
    lang: 'pl-PL',
    volume: 1,
    rate: 1,
    pitch: 1
  };
  
  // Połącz opcje
  const finalOptions = { ...defaultOptions, ...options };
  
  // Utwórz nowy obiekt syntezy mowy
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Ustaw opcje
  utterance.lang = finalOptions.lang;
  utterance.volume = finalOptions.volume;
  utterance.rate = finalOptions.rate;
  utterance.pitch = finalOptions.pitch;
  
  // Pobierz dostępne głosy
  const voices = window.speechSynthesis.getVoices();
  
  // Jeśli nie ma głosów, użyj domyślnego
  if (voices.length === 0) {
    console.warn('Brak dostępnych głosów, używam domyślnego');
  } else {
    // Spróbuj znaleźć polski głos
    const polishVoice = voices.find(voice => voice.lang.startsWith('pl'));
    if (polishVoice) {
      console.log('Znaleziono polski głos:', polishVoice.name);
      utterance.voice = polishVoice;
    } else {
      console.warn('Nie znaleziono polskiego głosu, używam domyślnego');
    }
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
  };
  
  // Rozpocznij syntezę mowy
  console.log('Rozpoczynam syntezę mowy...');
  window.speechSynthesis.speak(utterance);
  
  return true;
}

/**
 * Zatrzymanie aktualnej syntezy mowy
 */
function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    console.log('Zatrzymano syntezę mowy');
    return true;
  }
  
  console.error('Web Speech API (synteza mowy) nie jest obsługiwana w tej przeglądarce');
  return false;
}

/**
 * Obsługa żądania TTS z serwera
 * @param {Object} data - Dane z serwera
 */
function handleTTSRequest(data) {
  console.log('Otrzymano żądanie web-tts:', data);
  
  if (!data || !data.text) {
    console.error('Brak tekstu do syntezy');
    return false;
  }
  
  // Zatrzymaj aktualną syntezę
  stopSpeaking();
  
  // Rozpocznij nową syntezę
  return speakText(data.text, data.options || {});
}

// Eksportuj funkcje
export {
  initSpeechSynthesis,
  speakText,
  stopSpeaking,
  handleTTSRequest
};
