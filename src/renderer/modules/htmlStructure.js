/**
 * Moduł generujący strukturę HTML aplikacji
 */

/**
 * Generuje główną strukturę HTML aplikacji
 */
function generateHTMLStructure() {
  const root = document.getElementById('root');
  
  // Create main UI structure with full screen layout
  root.innerHTML = `
    <div class="app-container">
      <header class="app-header">
        <h1>VideoChat LLM</h1>
      </header>
      
      <main class="app-content">
        <div class="main-layout">
          <div class="left-panel">
            <div class="user-video">
              <h2>Twój obraz</h2>
              <div id="user-video-placeholder">
                <p>Ładowanie kamery...</p>
              </div>
            </div>
            
            <div class="chat-container">
              <h2>Czat</h2>
              <div id="chat-history"></div>
              <div class="command-shortcuts">
                <h3>Komendy dla bota:</h3>
                <div class="command-buttons">
                  <button class="command-btn" data-command="Wyszukaj w Google frazę 'Playwright browser automation'">Wyszukaj w Google</button>
                  <button class="command-btn" data-command="Wypełnij formularz na stronie W3Schools">Wypełnij formularz</button>
                  <button class="command-btn" data-command="Przejdź do strony example.com">Otwórz stronę</button>
                  <button class="command-btn" data-command="Zrób zrzut ekranu">Zrzut ekranu</button>
                  <button class="command-btn" data-command="Kliknij pierwszy link na stronie">Kliknij link</button>
                </div>
              </div>
              <div class="controls">
                <button id="start-btn">Start</button>
                <button id="stop-btn">Stop</button>
              </div>
            </div>
          </div>
          
          <div class="right-panel">
            <div class="browser-container">
              <h2>Przeglądarka</h2>
              <div id="novnc-container">
                <p>Ładowanie przeglądarki...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer class="app-footer">
        <p>VideoChat LLM &copy; 2025</p>
      </footer>
    </div>
  `;
}

/**
 * Dodaje style CSS do strony
 */
function addStyles() {
  // Sprawdź, czy style już istnieją
  if (document.getElementById('dynamic-styles')) {
    return;
  }
  
  // Utwórz element style
  const style = document.createElement('style');
  style.id = 'dynamic-styles';
  
  // Dodaj style CSS
  style.textContent = `
    /* Dodatkowe style dynamiczne */
    .interim-transcript {
      color: #888;
      font-style: italic;
      margin: 5px 0;
      padding: 5px;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
    
    .volume-indicator {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      height: 50px;
      margin: 10px 0;
      gap: 2px;
    }
    
    .volume-bar {
      width: 10px;
      height: 10%;
      background-color: #50fa7b;
      border-radius: 2px;
      transition: height 0.1s ease, background-color 0.1s ease;
    }
    
    .permission-button {
      background-color: #50fa7b;
      color: #282a36;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      margin: 10px 0;
    }
    
    .permission-button:hover {
      background-color: #5af78e;
    }
  `;
  
  // Dodaj do dokumentu
  document.head.appendChild(style);
}

export {
  generateHTMLStructure,
  addStyles
};
