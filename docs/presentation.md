# 📑 Spis treści

- [Co to jest VideoChat LLM?](#1-co-to-jest-videochat-llm)
- [Główne korzyści](#2-główne-korzyści)
- [Przykłady użycia](#3-przykłady-użycia)
- [Jak zacząć?](#4-jak-zacząć)
- [Podsumowanie](#5-podsumowanie)
- [Kontakt i dokumentacja](#6-kontakt-i-dokumentacja)

# VideoChat LLM z ASCII VNC – Prezentacja rozwiązania

---

## 1. Co to jest VideoChat LLM?

VideoChat LLM to nowoczesna aplikacja desktopowa umożliwiająca naturalną rozmowę głosową z asystentem AI, wizualizowanym jako animacja ASCII. Łączy lokalny model językowy, rozpoznawanie i syntezę mowy oraz infrastrukturę mikrousługową w jednym, łatwym do wdrożenia pakiecie.

---

## 2. Główne korzyści

- **Prywatność**: Wszystkie modele (LLM, TTS, STT) działają lokalnie, bez wysyłania danych do chmury.
- **Brak zależności od internetu**: Rozmowy i przetwarzanie mowy działają offline.
- **Uniwersalność**: Obsługa Linux (AppImage, DEB, RPM), łatwa instalacja na różnych dystrybucjach.
- **Automatyzacja**: Instalacja i testy w pełni zautomatyzowane (`install.sh`, `test.sh`).
- **Nowoczesny interfejs**: Połączenie Electron + React + animacje ASCII.
- **Elastyczność**: Możliwość wdrożenia jako pojedyncza aplikacja lub zestaw mikrousług (K3s, Terraform, Ansible).
- **Open Source**: Kod dostępny do modyfikacji i rozwoju.

---

## 3. Przykłady użycia

### Przykład 1: Asystent biurowy offline
- Użytkownik uruchamia aplikację na swoim laptopie bez dostępu do internetu.
- Może prowadzić rozmowy głosowe z AI, dyktować notatki, zadawać pytania.
- Wszystko działa lokalnie, dane nie opuszczają komputera.

### Przykład 2: Terminalowy asystent dla DevOps
- Integracja z infrastrukturą K3s/Terraform/Ansible.
- Bot może przyjąć polecenie głosowe (np. „zrestartuj serwis X”, „pokaż status klastra”) i wykonać je przez backend.
- Animacja ASCII pokazuje status operacji na żywo.

### Przykład 3: Edukacja i nauka języków
- Uczeń ćwiczy wymowę i konwersacje z AI.
- System rozpoznaje mowę, poprawia błędy, odpowiada głosem.
- Historia rozmów pozwala śledzić postępy.

---

## 4. Jak zacząć?

1. Zainstaluj zależności systemowe (patrz README.md)
2. Uruchom `./install.sh` – wszystko zostanie przygotowane automatycznie
3. Startuj aplikację: `./bin/start-app`
4. Testuj i rozwijaj własne funkcje!

---

## 5. Podsumowanie

VideoChat LLM to kompletne, prywatne i nowoczesne rozwiązanie AI na desktop. Idealne do biura, edukacji, pracy offline i jako baza do własnych projektów głosowych lub konwersacyjnych.

---

## 6. Kontakt i dokumentacja

- Szczegóły techniczne: README.md, katalog docs/
- Skrypt instalacyjny: install.sh
- Skrypt testowy: test.sh
