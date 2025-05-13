import React from 'react';

function ChatHistory({ messages }) {
  return (
    <div className="history-container">
      {messages.length === 0 ? (
        <div className="empty-history">
          <p>Brak historii rozmowy. Rozpocznij rozmowę w zakładce VideoChat.</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div key={index} className={`history-message ${message.type}`}>
            <div className={`avatar ${message.type}`}>
              {message.type === 'user' ? '👤' : '🤖'}
            </div>
            <div className="content">
              {message.text}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ChatHistory;