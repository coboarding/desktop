import React, { useEffect, useRef } from 'react';

// Ten komponent jest alternatywą dla iframe, używającą bezpośrednio biblioteki noVNC
function NoVNCDisplay({ width, height, onLoad }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    let rfb = null;
    
    const initNoVNC = async () => {
      try {
        // Importy biblioteki noVNC
        const RFB = window.RFB;
        
        if (!RFB) {
          console.error('Nie znaleziono biblioteki noVNC');
          return;
        }
        
        // Inicjalizacja klienta noVNC
        rfb = new RFB(containerRef.current, 'ws://localhost:6080');
        
        rfb.addEventListener('connect', () => {
          console.log('Połączono z serwerem noVNC');
          if (onLoad) onLoad(true);
        });
        
        rfb.addEventListener('disconnect', (e) => {
          console.log('Rozłączono z serwerem noVNC:', e);
          if (onLoad) onLoad(false);
        });
      } catch (error) {
        console.error('Błąd inicjalizacji noVNC:', error);
      }
    };
    
    // Załaduj skrypty noVNC
    const script = document.createElement('script');
    script.src = 'http://localhost:6080/core/rfb.js';
    script.onload = initNoVNC;
    document.body.appendChild(script);
    
    return () => {
      // Czyszczenie
      if (rfb) {
        rfb.disconnect();
      }
      document.body.removeChild(script);
    };
  }, [onLoad]);
  
  return (
    <div 
      ref={containerRef} 
      className="novnc-container"
      style={{ width, height }}
    />
  );
}

export default NoVNCDisplay;