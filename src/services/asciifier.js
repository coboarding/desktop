const blessed = require('blessed');
const contrib = require('blessed-contrib');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

class AsciiGenerator {
  constructor(options = {}) {
    this.width = options.width || 60;
    this.height = options.height || 20;
    this.animationSets = {
      idle: [],
      talking: [],
      listening: [],
      thinking: []
    };
    this.currentSet = 'idle';
  }
  
  async initialize() {
    try {
      log.info('Inicjalizacja generatora ASCII...');
      
      // Wczytaj animacje z plików
      Object.keys(this.animationSets).forEach(type => {
        const filePath = path.join(__dirname, `../ascii-animations/${type}.txt`);
        
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.animationSets[type] = content.split('FRAME').filter(f => f.trim().length > 0);
        } else {
          // Utwórz domyślną animację jeśli brak pliku
          this.animationSets[type] = this.generateDefaultAnimationSet(type);
        }
      });
      
      return true;
    } catch (error) {
      log.error('Błąd inicjalizacji generatora ASCII:', error);
      return false;
    }
  }
  
  generateDefaultAnimationSet(type) {
    const frames = [];
    
    // Generuj 5 podstawowych klatek
    for (let i = 0; i < 5; i++) {
      let frame = '';
      
      switch (type) {
        case 'idle':
          frame = this.generateFace('neutral', i);
          break;
        case 'talking':
          frame = this.generateFace('talking', i);
          break;
        case 'listening':
          frame = this.generateFace('listening', i);
          break;
        case 'thinking':
          frame = this.generateFace('thinking', i);
          break;
      }
      
      frames.push(frame);
    }
    
    return frames;
  }
  
  generateFace(expression, frameIndex) {
    // Prosta proceduralna generacja ASCII art dla różnych wyrazów twarzy
    let eyes = '';
    let mouth = '';
    
    switch (expression) {
      case 'neutral':
        eyes = '  o   o  ';
        mouth = '   ---   ';
        break;
      case 'talking':
        eyes = '  o   o  ';
        mouth = frameIndex % 2 === 0 ? '   ---   ' : '   ===   ';
        break;
      case 'listening':
        eyes = '  ^   ^  ';
        mouth = '   ---   ';
        break;
      case 'thinking':
        eyes = '  o   -  ';
        mouth = '   ---   ';
        break;
    }
    
    return `
+----------+
|          |
| ${eyes} |
|          |
| ${mouth} |
|          |
+----------+
    `;
  }
  
  getAnimation(type) {
    if (type && this.animationSets[type]) {
      this.currentSet = type;
    }
    
    return this.animationSets[this.currentSet];
  }
  
  getRandomFrame(type) {
    const frames = this.getAnimation(type);
    const randomIndex = Math.floor(Math.random() * frames.length);
    return frames[randomIndex];
  }
  
  getSequentialFrame(type, index) {
    const frames = this.getAnimation(type);
    const frameIndex = index % frames.length;
    return frames[frameIndex];
  }
}

module.exports = AsciiGenerator;