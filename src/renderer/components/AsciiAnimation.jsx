import React, { useEffect, useRef, useState } from 'react';

function AsciiAnimation({ animationType = 'idle', width = 500, height = 400 }) {
  const canvasRef = useRef(null);
  const [novncUrl, setNovncUrl] = useState('');
  
  useEffect(() => {
    // Dynamiczne generowanie URL do noVNC
    const port = 6080; // Port, na którym działa serwer noVNC
    const host = window.location.hostname;
    const url = `http://${host}:${port}/vnc.html?host=${host}&port=${port}&autoconnect=true&resize=scale&quality=3`;
    setNovncUrl(url);
    
    // Powiadom główny proces o zmianie typu animacji
    window.electronAPI.setAnimationType(animationType);
  }, [animationType]);
  
  return (
    <div className="ascii-animation">
      <iframe
        src={novncUrl}
        width={width}
        height={height}
        frameBorder="0"
        scrolling="no"
        className="novnc-frame"
        title="ASCII Animation"
      />
    </div>
  );
}

export default AsciiAnimation;