/**
 * Browser Automation UI for noVNC
 * Provides HTML and JavaScript for browser automation interface
 */

// HTML template for the browser automation interface
function getBrowserAutomationHTML() {
  return `
    <div id="browser-automation-container">
      <div id="browser-viewport">
        <iframe id="browser-frame" src="about:blank" frameborder="0"></iframe>
      </div>
      <div id="browser-controls">
        <div class="url-bar">
          <input type="text" id="url-input" placeholder="https://www.google.com" />
          <button id="navigate-btn">Go</button>
        </div>
        <div class="action-buttons">
          <button id="back-btn" title="Back">←</button>
          <button id="forward-btn" title="Forward">→</button>
          <button id="refresh-btn" title="Refresh">↻</button>
          <button id="screenshot-btn" title="Take Screenshot">📷</button>
          <button id="test-btn" title="Run Test">▶️</button>
        </div>
      </div>
      <div id="browser-status">Ready</div>
    </div>
  `;
}

// CSS styles for the browser automation interface
function getBrowserAutomationCSS() {
  return `
    #browser-automation-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background-color: #282a36;
      color: #f8f8f2;
      font-family: 'Courier New', monospace;
    }
    
    #browser-viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      background-color: #fff;
      border: 1px solid #44475a;
    }
    
    #browser-frame {
      width: 100%;
      height: 100%;
      border: none;
      background-color: #fff;
    }
    
    #browser-controls {
      display: flex;
      flex-direction: column;
      padding: 8px;
      background-color: #44475a;
      border-bottom: 1px solid #6272a4;
    }
    
    .url-bar {
      display: flex;
      margin-bottom: 8px;
    }
    
    #url-input {
      flex: 1;
      padding: 8px;
      background-color: #282a36;
      color: #f8f8f2;
      border: 1px solid #6272a4;
      border-radius: 4px 0 0 4px;
      font-family: 'Courier New', monospace;
    }
    
    #navigate-btn {
      padding: 8px 12px;
      background-color: #50fa7b;
      color: #282a36;
      border: none;
      border-radius: 0 4px 4px 0;
      cursor: pointer;
      font-weight: bold;
    }
    
    .action-buttons {
      display: flex;
      gap: 8px;
    }
    
    .action-buttons button {
      padding: 6px 12px;
      background-color: #6272a4;
      color: #f8f8f2;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    
    .action-buttons button:hover {
      background-color: #44475a;
    }
    
    #browser-status {
      padding: 6px 8px;
      background-color: #282a36;
      color: #50fa7b;
      font-size: 12px;
      border-top: 1px solid #44475a;
    }
    
    /* Test scenario editor */
    #test-scenario-editor {
      position: absolute;
      top: 10%;
      left: 10%;
      width: 80%;
      height: 80%;
      background-color: #282a36;
      border: 1px solid #6272a4;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      z-index: 1000;
    }
    
    #test-scenario-editor.visible {
      display: flex;
    }
    
    .editor-header {
      padding: 8px;
      background-color: #44475a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .editor-header h3 {
      margin: 0;
      color: #f8f8f2;
    }
    
    .editor-close {
      background: none;
      border: none;
      color: #f8f8f2;
      font-size: 18px;
      cursor: pointer;
    }
    
    .editor-content {
      flex: 1;
      padding: 8px;
      overflow: auto;
    }
    
    #scenario-textarea {
      width: 100%;
      height: 100%;
      background-color: #282a36;
      color: #f8f8f2;
      border: 1px solid #44475a;
      padding: 8px;
      font-family: monospace;
      resize: none;
    }
    
    .editor-footer {
      padding: 8px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background-color: #44475a;
    }
    
    .editor-footer button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    #run-scenario-btn {
      background-color: #50fa7b;
      color: #282a36;
    }
    
    #cancel-scenario-btn {
      background-color: #ff5555;
      color: #f8f8f2;
    }
  `;
}

// JavaScript for the browser automation interface
function getBrowserAutomationScript() {
  return `
    // DOM elements
    const browserFrame = document.getElementById('browser-frame');
    const urlInput = document.getElementById('url-input');
    const navigateBtn = document.getElementById('navigate-btn');
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const screenshotBtn = document.getElementById('screenshot-btn');
    const testBtn = document.getElementById('test-btn');
    const browserStatus = document.getElementById('browser-status');
    
    // Create test scenario editor
    function createTestScenarioEditor() {
      const editor = document.createElement('div');
      editor.id = 'test-scenario-editor';
      
      editor.innerHTML = 
        '<div class="editor-header">' +
        '  <h3>Test Scenario Editor</h3>' +
        '  <button class="editor-close">&times;</button>' +
        '</div>' +
        '<div class="editor-content">' +
        '  <textarea id="scenario-textarea" placeholder="Enter test scenario in JSON format..."></textarea>' +
        '</div>' +
        '<div class="editor-footer">' +
        '  <button id="cancel-scenario-btn">Cancel</button>' +
        '  <button id="run-scenario-btn">Run Scenario</button>' +
        '</div>';
      
      document.body.appendChild(editor);
      
      // Add event listeners
      document.querySelector('.editor-close').addEventListener('click', () => {
        editor.classList.remove('visible');
      });
      
      document.getElementById('cancel-scenario-btn').addEventListener('click', () => {
        editor.classList.remove('visible');
      });
      
      document.getElementById('run-scenario-btn').addEventListener('click', () => {
        const scenarioText = document.getElementById('scenario-textarea').value;
        try {
          const scenario = JSON.parse(scenarioText);
          sendCommand('run-scenario', { scenario });
          editor.classList.remove('visible');
          updateStatus('Running test scenario...');
        } catch (error) {
          updateStatus('Invalid JSON format: ' + error.message);
        }
      });
      
      return editor;
    }
    
    // Initialize test scenario editor
    const testScenarioEditor = createTestScenarioEditor();
    
    // Helper function to update status
    function updateStatus(message) {
      browserStatus.textContent = message;
    }
    
    // Helper function to send commands to the server
    function sendCommand(command, data = {}) {
      try {
        socket.send(JSON.stringify({
          type: 'browser-command',
          command,
          data
        }));
      } catch (error) {
        updateStatus('Error sending command: ' + error.message);
      }
    }
    
    // Event listeners
    navigateBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) {
        sendCommand('navigate', { url });
        updateStatus('Navigating to ' + url + '...');
      }
    });
    
    urlInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        navigateBtn.click();
      }
    });
    
    backBtn.addEventListener('click', () => {
      sendCommand('back');
      updateStatus('Going back...');
    });
    
    forwardBtn.addEventListener('click', () => {
      sendCommand('forward');
      updateStatus('Going forward...');
    });
    
    refreshBtn.addEventListener('click', () => {
      sendCommand('refresh');
      updateStatus('Refreshing page...');
    });
    
    screenshotBtn.addEventListener('click', () => {
      sendCommand('screenshot');
      updateStatus('Taking screenshot...');
    });
    
    testBtn.addEventListener('click', () => {
      testScenarioEditor.classList.add('visible');
    });
    
    // Handle messages from the server
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'browser-update') {
          handleBrowserUpdate(data);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    // Handle browser updates from the server
    function handleBrowserUpdate(data) {
      switch (data.updateType) {
        case 'url':
          urlInput.value = data.url;
          break;
          
        case 'status':
          updateStatus(data.message);
          break;
          
        case 'screenshot':
          // Display screenshot in a modal or update the frame
          break;
          
        case 'navigation':
          urlInput.value = data.url;
          updateStatus('Page loaded: ' + data.url);
          break;
          
        case 'error':
          updateStatus('Error: ' + data.message);
          break;
      }
    }
    
    // Initialize with a default URL
    urlInput.value = 'https://www.google.com';
  `;
}

// Function to generate the complete browser automation interface
function generateBrowserAutomationInterface() {
  return {
    html: getBrowserAutomationHTML(),
    css: getBrowserAutomationCSS(),
    script: getBrowserAutomationScript()
  };
}

module.exports = {
  generateBrowserAutomationInterface
};