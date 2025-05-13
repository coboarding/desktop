import React from 'react';

function BotCommands() {
  // Lista dostępnych komend
  const commands = [
    { id: 'search', text: 'Wyszukaj w Google', command: 'Wyszukaj w Google frazę "Playwright"' },
    { id: 'form', text: 'Wypełnij formularz', command: 'Wypełnij formularz na stronie' },
    { id: 'navigate', text: 'Otwórz stronę', command: 'Przejdź do strony example.com' },
    { id: 'screenshot', text: 'Zrzut ekranu', command: 'Zrób zrzut ekranu' }
  ];

  // Funkcja do wysyłania komendy do czatu
  const sendCommand = (command) => {
    // Tworzymy nowe zdarzenie z komendą
    const event = new CustomEvent('bot-command', { 
      detail: { command } 
    });
    
    // Wysyłamy zdarzenie, które zostanie obsłużone w App.js
    window.dispatchEvent(event);
  };

  return (
    <div className="bot-commands">
      <h3>Komendy bota</h3>
      <div className="commands-list">
        {commands.map(cmd => (
          <button 
            key={cmd.id}
            className="command-button"
            onClick={() => sendCommand(cmd.command)}
          >
            {cmd.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default BotCommands;
