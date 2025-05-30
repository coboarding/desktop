/**
 * CSS Styles for noVNC Server
 * Contains all the styles used in the noVNC interface
 */

// Main styles for the noVNC interface
function getMainStyles() {
  return `
    body, html {
      margin: 0;
      padding: 0;
      background-color: #282a36;
      color: #50fa7b;
      font-family: 'Courier New', monospace;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    #ascii-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 24px;
      white-space: pre;
      text-align: center;
      line-height: 1.2;
      padding: 20px;
      box-sizing: border-box;
    }
    
    /* Animation for the ASCII art */
    @keyframes pulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }
    
    #ascii-container {
      animation: pulse 2s infinite;
    }
    
    /* Status indicator */
    .status {
      position: fixed;
      bottom: 10px;
      right: 10px;
      padding: 5px 10px;
      background-color: rgba(80, 250, 123, 0.3);
      border-radius: 4px;
      font-size: 12px;
    }
    
    /* Interim transcript styles */
    #interim-text {
      position: fixed;
      bottom: 40px;
      left: 10px;
      right: 10px;
      color: #bd93f9;
      font-style: italic;
      padding: 5px 10px;
      border-left: 2px solid #50fa7b;
      background-color: rgba(80, 250, 123, 0.1);
      border-radius: 4px;
      transition: opacity 0.3s ease;
    }
    
    .interim-transcript {
      opacity: 0.7;
    }
    
    .interim-transcript:empty {
      opacity: 0;
      height: 0;
      padding: 0;
    }
    
    /* Permission button styles */
    .permission-button {
      display: block;
      margin: 10px auto;
      padding: 10px 15px;
      background-color: #ff5555;
      color: #f8f8f2;
      border: none;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      animation: pulse-attention 2s infinite;
    }
    
    .permission-button:hover {
      background-color: #ff6e6e;
      transform: scale(1.05);
    }
    
    .permission-button:active {
      background-color: #e64747;
      transform: scale(0.98);
    }
    
    @keyframes pulse-attention {
      0% { box-shadow: 0 0 0 0 rgba(255, 85, 85, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(255, 85, 85, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 85, 85, 0); }
    }
    
    /* Volume indicator styles */
    .volume-indicator {
      position: fixed;
      bottom: 70px;
      right: 10px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: #50fa7b;
      opacity: 0.2;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    
    .volume-indicator.pulse {
      opacity: 0.8;
      transform: scale(1.2);
    }
    
    @keyframes volume-pulse {
      0% { transform: scale(1); opacity: 0.2; }
      50% { transform: scale(1.3); opacity: 0.8; }
      100% { transform: scale(1); opacity: 0.2; }
    }
  `;
}

// Dark theme styles
function getDarkThemeStyles() {
  return `
    body, html {
      background-color: #1a1a1a;
      color: #50fa7b;
    }
    
    .status {
      background-color: rgba(80, 250, 123, 0.2);
    }
  `;
}

// Light theme styles
function getLightThemeStyles() {
  return `
    body, html {
      background-color: #f5f5f5;
      color: #2a9d8f;
    }
    
    .status {
      background-color: rgba(42, 157, 143, 0.2);
    }
  `;
}

module.exports = {
  getMainStyles,
  getDarkThemeStyles,
  getLightThemeStyles
};