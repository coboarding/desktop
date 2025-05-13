/**
 * Network Utilities for noVNC Server
 * Contains helper functions for network operations
 */

const http = require('http');
const log = require('electron-log');

/**
 * Find an available port starting from a given port
 * @param {number} startPort - The port to start checking from
 * @param {number} maxAttempts - Maximum number of attempts to find an available port
 * @returns {Promise<number>} - A promise that resolves to an available port
 */
function findAvailablePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;
    
    const tryPort = (port) => {
      const testServer = http.createServer();
      
      testServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          log.warn(`Port ${port} jest już zajęty, próbuję następny...`);
          testServer.close();
          
          // Spróbuj następny port
          if (attempts < maxAttempts) {
            attempts++;
            tryPort(port + 1);
          } else {
            reject(new Error(`Nie można znaleźć dostępnego portu po ${maxAttempts} próbach`));
          }
        } else {
          reject(err);
        }
      });
      
      testServer.once('listening', () => {
        testServer.close();
        resolve(port);
      });
      
      testServer.listen(port);
    };
    
    tryPort(currentPort);
  });
}

/**
 * Create and configure an HTTP server
 * @param {Function} requestHandler - The request handler function
 * @returns {http.Server} - The configured HTTP server
 */
function createHttpServer(requestHandler) {
  return http.createServer(requestHandler);
}

/**
 * Start a server on a specific port with error handling
 * @param {http.Server} server - The server to start
 * @param {number} port - The port to listen on
 * @returns {Promise<number>} - A promise that resolves to the actual port the server is listening on
 */
function startServer(server, port) {
  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      log.error(`Błąd podczas uruchamiania serwera: ${err.message}`);
      reject(err);
    });
    
    server.listen(port, () => {
      // Pobierz rzeczywisty port przydzielony przez system
      const actualPort = server.address().port;
      log.info(`Serwer uruchomiony na porcie ${actualPort}`);
      resolve(actualPort);
    });
  });
}

module.exports = {
  findAvailablePort,
  createHttpServer,
  startServer
};
