/**
 * Client Scripts for noVNC Server
 * Contains all the JavaScript code executed on the client side
 */

// Main client script for the noVNC interface
function getMainScript() {
  return `
    // Połączenie WebSocket
    const socket = new WebSocket(\`ws://\${window.location.hostname}:\${window.location.port}\`);
    const container = document.getElementById('ascii-container');
    
    // Dostosuj rozmiar czcionki do rozmiaru okna
    function adjustFontSize() {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Zakładamy, że ASCII art ma około 20 znaków szerokości i 12 linii wysokości
      const idealCharWidth = containerWidth / 20;
      const idealCharHeight = containerHeight / 12;
      
      // Wybierz mniejszą wartość, aby zapewnić, że cały ASCII art będzie widoczny
      const fontSize = Math.min(idealCharWidth, idealCharHeight * 2);
      
      container.style.fontSize = fontSize + 'px';
    }
    
    // Dostosuj rozmiar przy ładowaniu i zmianie rozmiaru okna
    window.addEventListener('load', adjustFontSize);
    window.addEventListener('resize', adjustFontSize);
    
    // Obsługa wiadomości
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'ascii-frame') {
          container.textContent = data.frame;
          adjustFontSize();
        }
      } catch (error) {
        console.error('Błąd przetwarzania wiadomości:', error);
      }
    });
    
    // Obsługa błędów
    socket.addEventListener('error', (error) => {
      console.error('Błąd WebSocket:', error);
    });
    
    socket.addEventListener('close', () => {
      console.log('Połączenie WebSocket zamknięte');
      container.textContent = 'Połączenie przerwane. Odświeżyć stronę?';
    });
  `;
}

// Animation control script
function getAnimationControlScript() {
  return `
    // Funkcja do sterowania animacją
    function controlAnimation(type) {
      try {
        socket.send(JSON.stringify({
          type: 'control-animation',
          animationType: type
        }));
      } catch (error) {
        console.error('Błąd wysyłania polecenia animacji:', error);
      }
    }
    
    // Przyciski sterowania (jeśli są w HTML)
    const controlButtons = document.querySelectorAll('.control-button');
    if (controlButtons) {
      controlButtons.forEach(button => {
        button.addEventListener('click', () => {
          const animationType = button.getAttribute('data-animation');
          if (animationType) {
            controlAnimation(animationType);
          }
        });
      });
    }
  `;
}

// Debug script for development
function getDebugScript() {
  return `
    // Funkcje debugowania
    const debugMode = localStorage.getItem('debugMode') === 'true';
    
    if (debugMode) {
      const debugPanel = document.createElement('div');
      debugPanel.className = 'debug-panel';
      debugPanel.innerHTML = '<h3>Panel debugowania</h3><div id="debug-log"></div>';
      document.body.appendChild(debugPanel);
      
      // Nadpisanie console.log
      const originalLog = console.log;
      console.log = function(...args) {
        originalLog.apply(console, args);
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
          const logEntry = document.createElement('div');
          logEntry.textContent = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : arg
          ).join(' ');
          debugLog.appendChild(logEntry);
        }
      };
    }
  `;
}

module.exports = {
  getMainScript,
  getAnimationControlScript,
  getDebugScript
};