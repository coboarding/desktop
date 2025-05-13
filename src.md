videochat-llm-app/
├── bin/
│   └── start-app                  # Główny skrypt uruchomieniowy
├── src/
│   ├── main.js                    # Główny proces Electron
│   ├── preload.js                 # Skrypt preload do bezpiecznej komunikacji
│   ├── renderer/                  # Kod interfejsu użytkownika
│   │   ├── index.html             # Główny plik HTML
│   │   ├── styles.css             # Style CSS
│   │   ├── app.js                 # Główny komponent React
│   │   ├── components/            # Komponenty React
│   │   │   ├── VideoChat.jsx      # Główny komponent wideorozmowy
│   │   │   ├── AsciiAnimation.jsx # Komponent animacji ASCII
│   │   │   ├── NoVNCDisplay.jsx   # Komponent do integracji noVNC
│   │   │   ├── ChatHistory.jsx    # Komponent historii rozmowy
│   │   │   └── Settings.jsx       # Komponent ustawień
│   ├── services/                  # Usługi backendu
│   │   ├── llm.js                 # Obsługa modelu językowego
│   │   ├── stt.js                 # Rozpoznawanie mowy
│   │   ├── tts.js                 # Synteza mowy
│   │   ├── asciifier.js           # Generator ASCII art
│   │   ├── novncServer.js         # Serwer noVNC
│   │   └── mediaManager.js        # Zarządzanie mediami
│   ├── ascii-animations/          # Szablony animacji ASCII
│   │   ├── talking.txt            # Animacja podczas mówienia
│   │   ├── listening.txt          # Animacja podczas słuchania
│   │   ├── idle.txt               # Animacja w stanie bezczynności
│   │   └── thinking.txt           # Animacja podczas przetwarzania
│   └── infrastructure/            # Zarządzanie infrastrukturą
│       ├── k3s.js                 # Obsługa Kubernetes (K3s)
│       └── config.js              # Konfiguracja infrastruktury
├── models/                        # Lokalne modele AI
│   ├── llm/                       # Model językowy
│   │   └── model.onnx             # Plik modelu ONNX
│   ├── tts/                       # Model syntezy mowy
│   │   └── model.bin              # Binarny plik modelu TTS
│   └── stt/                       # Model rozpoznawania mowy
│       └── model.bin              # Binarny plik modelu STT
├── kubernetes/                    # Konfiguracja Kubernetes
│   └── deployment.yaml            # Manifest wdrożenia
├── terraform/                     # Konfiguracja Terraform
│   └── main.tf                    # Definicja infrastruktury lokalnej
├── ansible/                       # Konfiguracja Ansible
│   └── setup.yml                  # Playbook konfiguracyjny
├── vendor/                        # Zewnętrzne zależności
│   ├── novnc/                     # Biblioteka noVNC
│   │   ├── vnc.html               # Strona HTML do wyświetlania ASCII
│   │   └── core/                  # Komponenty noVNC
│   └── k3s/                       # Binaria K3s
├── package.json                   # Konfiguracja projektu
├── install.sh                     # Skrypt instalacyjny
└── build.sh                       # Skrypt do budowania aplikacji