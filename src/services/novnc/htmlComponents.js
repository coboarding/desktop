/**
 * HTML Components for noVNC Server
 * Contains the HTML templates and structure for the noVNC interface
 */

// Main HTML template for the noVNC interface
function generateMainHtml(additionalScripts = '') {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCII Animation</title>
  ${getCssStyles()}
</head>
<body>
  ${getBodyContent()}
  ${getClientScripts()}
  ${additionalScripts}
</body>
</html>`;
}

// Body content template
function getBodyContent() {
  return `
  <div id="ascii-container"></div>
  <div class="status">Asystent VideoChat LLM</div>
  `;
}

// Get CSS styles from the cssStyles module
function getCssStyles() {
  return `<style>
    ${require('./cssStyles').getMainStyles()}
  </style>`;
}

// Get client scripts from the clientScripts module
function getClientScripts() {
  return `<script>
    ${require('./clientScripts').getMainScript()}
  </script>`;
}

module.exports = {
  generateMainHtml
};
