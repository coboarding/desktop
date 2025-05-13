import React, { useState } from 'react';

function RTSPVideoDescription({ onConfigChange }) {
  const [rtspUrl, setRtspUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rtspUrl) {
      setStatus('Podaj adres RTSP.');
      return;
    }
    // Przekaż konfigurację do rodzica lub IPC
    onConfigChange && onConfigChange({ rtspUrl, username, password });
    setStatus('Konfiguracja zapisana.');
  };

  return (
    <div className="rtsp-config-container">
      <h2>Konfiguracja RTSP Video</h2>
      <form onSubmit={handleSubmit}>
        <div className="setting-item">
          <label htmlFor="rtspUrl">Adres RTSP streamu</label>
          <input
            type="text"
            id="rtspUrl"
            value={rtspUrl}
            onChange={e => setRtspUrl(e.target.value)}
            placeholder="rtsp://adres:port/ścieżka"
            required
          />
        </div>
        <div className="setting-item">
          <label htmlFor="username">Nazwa użytkownika (opcjonalnie)</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="user"
          />
        </div>
        <div className="setting-item">
          <label htmlFor="password">Hasło (opcjonalnie)</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="hasło"
          />
          <label>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={e => setShowPassword(e.target.checked)}
            /> Pokaż hasło
          </label>
        </div>
        <button type="submit">Zapisz konfigurację</button>
        {status && <div className="status-info">{status}</div>}
      </form>
    </div>
  );
}

export default RTSPVideoDescription;
