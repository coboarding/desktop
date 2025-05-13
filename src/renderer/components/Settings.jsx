import React, { useState } from 'react';
import RTSPVideoDescription from './RTSPVideoDescription';

function Settings() {
  const [audioSettings, setAudioSettings] = useState({
    inputDevice: 'default',
    outputDevice: 'default',
    volume: 80
  });
  
  const [modelSettings, setModelSettings] = useState({
    llmModel: 'standard',
    ttsVoice: 'female',
    language: 'pl'
  });
  
  const [infraSettings, setInfraSettings] = useState({
    useK3s: true,
    useTerraform: true,
    localPort: 3000
  });
  
  const handleAudioChange = (e) => {
    const { name, value } = e.target;
    setAudioSettings(prev => ({
      ...prev,
      [name]: name === 'volume' ? parseInt(value) : value
    }));
  };
  
  const handleModelChange = (e) => {
    const { name, value } = e.target;
    setModelSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleInfraChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInfraSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const saveSettings = () => {
    // W rzeczywistości zapisalibyśmy te ustawienia do pliku konfiguracyjnego
    // lub przesłali przez IPC do procesu głównego
    alert('Ustawienia zapisane pomyślnie!');
  };
  
  return (
    <div className="settings-container">
      <div className="settings-section">
        <h2>Ustawienia Audio</h2>
        <div className="setting-item">
          <label htmlFor="inputDevice">Urządzenie wejściowe (mikrofon)</label>
          <select 
            id="inputDevice" 
            name="inputDevice" 
            value={audioSettings.inputDevice}
            onChange={handleAudioChange}
          >
            <option value="default">Domyślne urządzenie</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label htmlFor="outputDevice">Urządzenie wyjściowe (głośniki)</label>
          <select 
            id="outputDevice" 
            name="outputDevice" 
            value={audioSettings.outputDevice}
            onChange={handleAudioChange}
          >
            <option value="default">Domyślne urządzenie</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label htmlFor="volume">Głośność ({audioSettings.volume}%)</label>
          <input 
            type="range" 
            id="volume" 
            name="volume" 
            min="0" 
            max="100" 
            value={audioSettings.volume}
            onChange={handleAudioChange}
          />
        </div>
      </div>
      
      <div className="settings-section">
        <h2>Ustawienia Modeli</h2>
        <div className="setting-item">
          <label htmlFor="llmModel">Model LLM</label>
          <select 
            id="llmModel" 
            name="llmModel" 
            value={modelSettings.llmModel}
            onChange={handleModelChange}
          >
            <option value="standard">Standardowy (mały)</option>
            <option value="advanced">Zaawansowany (duży)</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label htmlFor="ttsVoice">Głos TTS</label>
          <select 
            id="ttsVoice" 
            name="ttsVoice" 
            value={modelSettings.ttsVoice}
            onChange={handleModelChange}
          >
            <option value="female">Żeński</option>
            <option value="male">Męski</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label htmlFor="language">Język</label>
          <select 
            id="language" 
            name="language" 
            value={modelSettings.language}
            onChange={handleModelChange}
          >
            <option value="pl">Polski</option>
            <option value="en">Angielski</option>
          </select>
        </div>
      </div>
      
      <div className="settings-section">
        <h2>Ustawienia Infrastruktury</h2>
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              name="useK3s" 
              checked={infraSettings.useK3s}
              onChange={handleInfraChange}
            />
            Używaj Kubernetes (K3s)
          </label>
        </div>
        
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              name="useTerraform" 
              checked={infraSettings.useTerraform}
              onChange={handleInfraChange}
            />
            Używaj Terraform
          </label>
        </div>
        
        <div className="setting-item">
          <label htmlFor="localPort">Port lokalny</label>
          <input 
            type="number" 
            id="localPort" 
            name="localPort" 
            value={infraSettings.localPort}
            onChange={handleInfraChange}
            min="1024" 
            max="65535"
          />
        </div>
      </div>
      
      <div className="settings-section">
        <h2>Ustawienia RTSP Video</h2>
        <RTSPVideoDescription onConfigChange={config => console.log('RTSP config:', config)} />
      </div>
      
      <div className="settings-section">
        <div className="setting-item">
          <button onClick={saveSettings}>Zapisz ustawienia</button>
        </div>
      </div>
    </div>
  );
}

export default Settings;