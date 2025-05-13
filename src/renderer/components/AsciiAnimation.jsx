import React, { useEffect, useRef, useState } from 'react';

function AsciiAnimation({ animationType = 'idle', width = 500, height = 400 }) {
  const [novncUrl, setNovncUrl] = useState('');
  const iframeRef = useRef(null);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // Dynamiczne generowanie URL do noVNC
    const port = 6080; // Port, na którym działa serwer noVNC
    const host = window.location.hostname;

    // Utwórz URL dla iframe noVNC
    const url = `http://${host}:${port}/vnc.html?host=${host}&port=${port}&autoconnect=true&resize=scale&quality=3`;
    setNovncUrl(url);

    // Powiadom główny proces o zmianie typu animacji
    window.electronAPI.setAnimationType(animationType);

    // Ustaw klasę CSS na podstawie typu animacji
    setAnimationClass(`animation-${animationType}`);

    // Log dla debugowania
    console.log(`Zmiana typu animacji: ${animationType}`);
    console.log(`NoVNC URL: ${url}`);

  }, [animationType]);

  return (
    <div className={`ascii-animation ${animationClass}`}>
      <iframe
        ref={iframeRef}
        src={novncUrl}
        width={width}
        height={height}
        frameBorder="0"
        scrolling="no"
        className="novnc-frame"
        title="ASCII Animation"
        sandbox="allow-scripts allow-same-origin"
      />
      {/* Nakładka wskazująca stan animacji */}
      <div className="animation-overlay">
        {animationType === 'listening' && (
          <div className="listening-animation">
            <div className="listening-wave"></div>
            <div className="listening-wave"></div>
            <div className="listening-wave"></div>
          </div>
        )}
        {animationType === 'talking' && (
          <div className="talking-animation">
            <div className="talking-circle"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AsciiAnimation;