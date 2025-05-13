const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { app } = require('electron');

class K3sManager {
  constructor(options) {
    this.kubeconfig = options.kubeconfig;
    this.process = null;
    this.appPath = app.getAppPath();
  }
  
  async start() {
    try {
      log.info('Uruchamianie K3s...');
      
      const k3sBin = path.join(this.appPath, 'vendor/k3s/k3s');
      
      if (!fs.existsSync(k3sBin)) {
        log.error(`Binarny plik K3s nie znaleziony: ${k3sBin}`);
        throw new Error('Binarny plik K3s nie znaleziony');
      }
      
      // Uruchomienie K3s w tle
      this.process = spawn(k3sBin, [
        'server',
        '--write-kubeconfig', this.kubeconfig,
        '--disable', 'traefik'  // Wyłączenie domyślnego ingress controllera
      ]);
      
      this.process.stdout.on('data', (data) => {
        log.info(`K3s: ${data}`);
      });
      
      this.process.stderr.on('data', (data) => {
        log.error(`K3s Error: ${data}`);
      });
      
      // Poczekaj na zainicjowanie K3s
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      log.info('K3s uruchomiony pomyślnie');
      return true;
    } catch (error) {
      log.error('Błąd uruchamiania K3s:', error);
      return false;
    }
  }
  
  async stop() {
    if (this.process) {
      log.info('Zatrzymywanie K3s...');
      this.process.kill();
      this.process = null;
      return true;
    }
    
    return false;
  }
}

module.exports = K3sManager;