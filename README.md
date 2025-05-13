# desktop
desktop
# VideoChat LLM z ASCII VNC - Dokumentacja

## 📑 Spis treści

- [Wprowadzenie](#wprowadzenie)
- [Funkcje](#funkcje)
- [Architektura](#architektura)
- [Instalacja i zależności systemowe](#instalacja-i-zależności-systemowe)
- [Testowanie i walidacja](#testowanie-i-walidacja)
- [Struktura projektu i dokumentacja](#struktura-projektu-i-dokumentacja)
- [Najczęstsze problemy](#najczęstsze-problemy)
- [Kontakt i wsparcie](#kontakt-i-wsparcie)
- [Prezentacja rozwiązania](./docs/presentation.md)
- [Szczegółowa dokumentacja](#szczegółowa-dokumentacja)
- [Konfiguracja RTSP Video](#konfiguracja-rtsp-video)

## Wprowadzenie

VideoChat LLM to aplikacja desktopowa oparta na Electron, która umożliwia prowadzenie rozmów głosowych z asystentem AI, wizualizowanym za pomocą animacji ASCII. Aplikacja łączy technologie przetwarzania języka naturalnego (LLM), rozpoznawania mowy (STT) i syntezy mowy (TTS) w jednym pakiecie, wraz z infrastrukturą Kubernetes (K3s), Terraform i Ansible do zarządzania swoimi komponentami.

## Funkcje

- **Interakcja głosowa** - rozpoznawanie i synteza mowy do naturalnej konwersacji
- **Animacja ASCII** - wizualizacja asystenta poprzez animacje ASCII w różnych stanach
- **Lokalny model językowy** - prosty LLM do przetwarzania zapytań
- **Infrastruktura mikrousługowa** - opcjonalne użycie Kubernetes (K3s) do zarządzania komponentami
- **Historia rozmów** - zapis przebiegu konwersacji
- **Konfigurowalność** - panel ustawień do dostosowania działania aplikacji

## Architektura

Aplikacja składa się z następujących komponentów:

1. **Frontend** - interfejs użytkownika napisany w React, wyświetlający wideo z kamery i animację ASCII
2. **Backend** - serwisy obsługujące LLM, STT i TTS
3. **NoVNC** - serwer do generowania i wyświetlania animacji ASCII
4. **Infrastruktura** - opcjonalne Kubernetes (K3s), Terraform i Ansible

### Diagram przepływu danych:

```
+----------+    Audio    +------------+    Text    +------------+
|          |----------->|             |---------->|             |
|  Kamera  |            |     STT     |           |     LLM     |
|  i Mic   |    Video   |             |           |             |
|          |-----+      +------------+           +------------+
+----------+     |                                     |
                 |                                     |
                 v                                     v
           +----------+                         +------------+
           |          |                         |             |
           |  React   |<------------------------|     TTS     |
           |   UI     |        Audio            |             |
           |          |                         +------------+
           +----------+                                |
                 |                                     |
                 |      ASCII Animation                |
                 v                                     v
           +----------+                         +------------+
           |          |                         |             |
           |  NoVNC   |<------------------------|  Asciifier  |
           |  Server  |                         |             |
           |          |                         +------------+
           +----------+
```

## Instalacja i zależności systemowe

1. **Zalecane zależności systemowe (dla natywnych modułów Node.js):**
   - Debian/Ubuntu: `sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
   - Fedora/RHEL: `sudo dnf install -y gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel librsvg2-devel`
   - Arch Linux: `sudo pacman -Sy --noconfirm base-devel cairo pango libjpeg-turbo giflib librsvg`
   - Jeśli nie możesz zainstalować automatycznie, sprawdź komunikaty w `install.sh`.

2. **Instalacja projektu:**
   ```sh
   ./install.sh
   ```
   Skrypt automatycznie sprawdzi i zainstaluje zależności systemowe oraz npm.

3. **Uruchomienie aplikacji:**
   ```sh
   ./bin/start-app
   ```
   Skrypt uruchomi aplikację Electron z lokalnej instalacji.

4. **Naprawa problemów:**
   - Jeśli pojawią się błędy z uprawnieniami, uruchom `sudo ./install.sh`.
   - Sprawdź logi w `~/.npm/_logs/` przy problemach z npm.

## Testowanie i walidacja

1. **Testy jednostkowe i E2E**:
   ```sh
   bash test.sh
   ```
   Skrypt uruchamia testy jednostkowe (Jest), E2E (jeśli dostępne), waliduje pliki YAML i JSON.

2. **Walidacja konfiguracji:**
   - YAML: `yamllint kubernetes/ terraform/ ansible/`
   - JSON: `jsonlint models/**/*.json --quiet`

## Struktura projektu i dokumentacja

- Szczegółowa dokumentacja znajduje się w katalogu `./docs/`
- Struktura katalogów i kluczowe pliki opisane są w `docs/2.md`

## Najczęstsze problemy

- **Problemy z natywnymi modułami**: Upewnij się, że masz zainstalowane zależności systemowe (patrz wyżej).
- **Problemy z Electron**: Jeśli pojawi się komunikat o błędnej instalacji Electron, usuń `node_modules` i uruchom ponownie `install.sh`.
- **Problemy z npm**: Sprawdź logi w `~/.npm/_logs/`.

## Kontakt i wsparcie

- Dokumentacja techniczna: katalog `docs/`
- Skrypt instalacyjny: `install.sh`
- Skrypt testowy: `test.sh`

---

Aplikacja VideoChat LLM z ASCII VNC to nowoczesny, samodzielny desktopowy asystent AI z pełną dokumentacją i automatyzacją instalacji oraz testów.

## Uruchomienie

Aplikacja uruchamia się w trybie Electron, tworząc okno desktopowe z interfejsem użytkownika. Po uruchomieniu:

1. Pojawia się interfejs podzielony na dwa panele - lewy z obrazem z kamery użytkownika, prawy z animacją ASCII asystenta
2. Asystent automatycznie wita użytkownika (wiadomość tekstowa i głosowa)
3. Użytkownik może rozpocząć rozmowę naciskając przycisk mikrofonu
4. Podczas mówienia przez użytkownika, animacja asystenta zmienia się w tryb "słuchania"
5. Po zakończeniu wypowiedzi, następuje przetwarzanie i animacja przechodzi w tryb "myślenia"
6. Asystent odpowiada (tekst i głos), z animacją w trybie "mówienia"
7. Cykl może być kontynuowany

## Infrastruktura

Aplikacja może opcjonalnie korzystać z Kubernetes (K3s) do zarządzania swoimi komponentami:

- W konfiguracji można włączyć/wyłączyć K3s
- Terraform zarządza lokalną konfiguracją infrastruktury
- Ansible wykonuje playbooki konfiguracyjne

## Dostosowanie

### Animacje ASCII

Animacje ASCII są przechowywane w plikach tekstowych w katalogu `src/ascii-animations/`. Każda animacja składa się z klatek oddzielonych znacznikiem `FRAME`. Dostępne animacje:

- `idle.txt` - stan spoczynku
- `talking.txt` - podczas mówienia
- `listening.txt` - podczas słuchania
- `thinking.txt` - podczas przetwarzania

Możesz dostosować te pliki, tworząc własne animacje ASCII.

### Ustawienia

Panel ustawień pozwala na konfigurację:

- Urządzeń audio (mikrofon, głośniki)
- Modeli AI (LLM, TTS)
- Infrastruktury (K3s, Terraform)

## Konfiguracja RTSP Video

Aplikacja umożliwia dodanie własnego źródła obrazu wideo poprzez protokół RTSP (np. kamera IP, rejestrator, streaming). Konfigurację można wykonać na dwa sposoby:

1. **Przez rozmowę w czacie VideoChat** – wystarczy napisać np. "Chcę dodać kamerę RTSP" lub podać adres streamu. Asystent poprosi kolejno o adres RTSP, login i hasło (jeśli wymagane), a następnie zapisze konfigurację.

2. **Przez zakładkę Ustawienia** – w sekcji "Ustawienia RTSP Video" można wpisać adres, login i hasło do streamu oraz zapisać konfigurację ręcznie.

Konfiguracja jest wykorzystywana do opisu obrazu wideo oraz dalszej integracji z asystentem.

## Budowanie pakietów

Aby zbudować pakiety instalacyjne:

```
./build.sh
```

Tworzy to pakiety dla systemu Linux w formatach:
- AppImage
- DEB
- RPM

## Wymagania systemowe

- Linux (Ubuntu, Debian, Fedora, itp.)
- Node.js 16+
- npm 8+

## Rozwiązywanie problemów

### Problemy z audio

- Upewnij się, że mikrofon jest poprawnie skonfigurowany
- Sprawdź uprawnienia przeglądarki do dostępu do mikrofonu
- Zresetuj urządzenia audio w panelu ustawień

### Problemy z K3s

- Sprawdź, czy K3s jest poprawnie zainstalowany
- Upewnij się, że kubeconfig jest poprawnie skonfigurowany
- Sprawdź logi aplikacji

### Problemy z animacją ASCII

- Sprawdź, czy serwer noVNC działa na porcie 6080
- Sprawdź logi serwera w konsoli aplikacji
- Upewnij się, że pliki animacji istnieją i są poprawnie sformatowane

## Licencja

Ten projekt jest udostępniany na licencji MIT.