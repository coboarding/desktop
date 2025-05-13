# desktop
desktop
# VideoChat LLM z ASCII VNC - Dokumentacja

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

## Instalacja

1. Sklonuj repozytorium
2. Uruchom skrypt instalacyjny:
   ```
   ./install.sh
   ```
3. Uruchom aplikację:
   ```
   ./bin/start-app
   ```

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