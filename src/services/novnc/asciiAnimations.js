/**
 * ASCII Animations for noVNC Server
 * Contains all the ASCII art animations used in the interface
 */

// Default animations for different states
const defaultAnimations = {
  idle: `
   +----------------+
   |                |
   |    /\    /\    |
   |   /  \  /  \   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \__/  \__/   |
   |                |
   |      ----      |
   |                |
   +----------------+
        `,
  talking: `
   +----------------+
   |                |
   |    /\    /\    |
   |   /  \  /  \   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \__/  \__/   |
   |                |
   |      ====      |
   |                |
   +----------------+
        `,
  listening: `
   +----------------+
   |                |
   |    /\    /\    |
   |   /  \  /  \   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \__/  \__/   |
   |                |
   |      ....      |
   |                |
   +----------------+
        `,
  thinking: `
   +----------------+
   |                |
   |    /\    /\    |
   |   /  \  /  \   |
   |  |    ||    |  |
   |  |    ||    |  |
   |   \__/  \__/   |
   |                |
   |      ????      |
   |                |
   +----------------+
        `
};

// Helper function to load animations from files
function loadAnimationFromFile(appPath, animationType) {
  const fs = require('fs');
  const path = require('path');
  const log = require('electron-log');
  
  const animationPath = path.join(
    appPath,
    `src/ascii-animations/${animationType}.txt`
  );

  try {
    if (fs.existsSync(animationPath)) {
      let frames = fs.readFileSync(animationPath, 'utf-8').split('FRAME');
      // Usuń puste klatki
      frames = frames.filter(frame => frame.trim().length > 0);
      return frames;
    }
  } catch (error) {
    log.error(`Błąd ładowania animacji z pliku: ${error}`);
  }
  
  return null;
}

// Get a random frame from an animation
function getRandomFrame(frames) {
  if (!frames || frames.length === 0) {
    return null;
  }
  
  const frameIndex = Math.floor(Math.random() * frames.length);
  return frames[frameIndex];
}

// Get a frame for a specific animation type
function getAnimationFrame(appPath, animationType) {
  // Próbuj załadować z pliku
  const frames = loadAnimationFromFile(appPath, animationType);
  
  if (frames && frames.length > 0) {
    return getRandomFrame(frames);
  }
  
  // Jeśli nie udało się załadować z pliku, użyj domyślnej animacji
  return defaultAnimations[animationType] || defaultAnimations.idle;
}

module.exports = {
  defaultAnimations,
  getAnimationFrame,
  loadAnimationFromFile
};