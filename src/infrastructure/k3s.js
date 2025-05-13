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
      
      // Utwórz katalog dla kubeconfig, jeśli nie istnieje
      const kubeconfigDir = path.dirname(this.kubeconfig);
      if (!fs.existsSync(kubeconfigDir)) {
        fs.mkdirSync(kubeconfigDir, { recursive: true });
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
      log.info('K3s zatrzymany');
      return true;
    }

    return false;
  }

  async deployApplication() {
    try {
      log.info('Wdrażanie aplikacji do K3s...');

      // Sprawdź, czy kubectl jest dostępny
      const kubectl = path.join(this.appPath, 'vendor/kubectl');

      if (!fs.existsSync(kubectl)) {
        log.error('Kubectl nie znaleziony');
        return false;
      }

      // Ścieżka do pliku manifestu
      const manifestPath = path.join(this.appPath, 'kubernetes/deployment.yaml');

      if (!fs.existsSync(manifestPath)) {
        log.error(`Manifest nie znaleziony: ${manifestPath}`);
        return false;
      }

      // Zastosuj manifest
      const deployProcess = spawn(kubectl, [
        '--kubeconfig', this.kubeconfig,
        'apply',
        '-f', manifestPath
      ]);

      // Obsługa wyniku
      const result = await new Promise((resolve) => {
        let output = '';

        deployProcess.stdout.on('data', (data) => {
          output += data.toString();
          log.info(`Kubectl: ${data}`);
        });

        deployProcess.stderr.on('data', (data) => {
          output += data.toString();
          log.error(`Kubectl Error: ${data}`);
        });

        deployProcess.on('close', (code) => {
          resolve({ code, output });
        });
      });

      if (result.code === 0) {
        log.info('Aplikacja pomyślnie wdrożona do K3s');
        return true;
      } else {
        log.error(`Błąd wdrażania aplikacji: ${result.output}`);
        return false;
      }
    } catch (error) {
      log.error('Błąd wdrażania aplikacji:', error);
      return false;
    }
  }
}

module.exports = K3sManager;