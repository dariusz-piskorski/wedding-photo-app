# WeddingWeb - Aplikacja do Udostępniania Wspomnień Ślubnych

## Spis Treści
1.  [Cel Projektu](#1-cel-projektu)
2.  [Kluczowe Funkcjonalności](#2-kluczowe-funkcjonalności)
3.  [Technologie](#3-technologie)
4.  [Struktura Projektu](#4-struktura-projektu)
5.  [Konfiguracja i Wdrożenie](#5-konfiguracja-i-wdrożenie)
6.  [Użycie Aplikacji](#6-użycie-aplikacji)
7.  [Dziennik Rozwoju i Kluczowe Zmiany](#7-dziennik-rozwoju-i-kluczowe-zmiany)
8.  [Przyszłe Ulepszenia](#8-przyszłe-ulepszenia)

---

## 1. Cel Projektu
Stworzenie prostej i intuicyjnej aplikacji webowej, która umożliwi gościom weselnym łatwe przesyłanie zdjęć i filmów z uroczystości. Aplikacja jest darmowa, bezpieczna i w pełni responsywna, z naciskiem na wygodę użytkowania na urządzeniach mobilnych.

## 2. Kluczowe Funkcjonalności
*   **Przesyłanie Plików:** Goście mogą przesyłać zdjęcia i filmy bez konieczności logowania. Podczas przesyłania wyświetlany jest szczegółowy status postępu (numer pliku i jego nazwa).
*   **Galeria na Żywo:** Dynamicznie ładowana galeria wyświetlająca wszystkie przesłane zdjęcia i filmy w czasie rzeczywistym. Implementacja paginacji/nieskończonego przewijania dla optymalnego ładowania dużych kolekcji.
*   **Lazy Loading Obrazów:** Miniatury w galerii są ładowane asynchronicznie (tylko gdy są widoczne w obszarze widoku), co znacznie przyspiesza początkowe ładowanie strony i poprawia wydajność.
*   **Pobieranie Pojedynczych Plików:** Możliwość pobrania pojedynczego zdjęcia (z poziomu lightboxa). Powiadomienia o rozpoczęciu i zakończeniu pobierania.
*   **Wskaźniki Ładowania i Blokada Interakcji:** Podczas operacji przesyłania plików, strona jest blokowana półprzezroczystym overlayem z animowanym spinnerem. Wszystkie komunikaty i wskaźniki ładowania wyświetlają się nad tym tłem.
*   **Responsywny Design:** Pełna responsywność (mobile-first) zapewniająca komfortowe użytkowanie na różnych urządzeniach.

## 3. Technologie
*   **Backend:** Node.js (JavaScript) z Express.js - służy jako bezpieczny serwer do obsługi logiki przesyłania plików.
*   **Frontend:** HTML5, CSS3, JavaScript - do budowy interfejsu użytkownika.
*   **Przechowywanie Plików i Hosting Backendu:** Fly.io - darmowy hosting dla serwera Node.js z 3 GB trwałej pamięci masowej na pliki.
*   **Hosting Frontendu:** GitHub Pages - darmowy hosting dla statycznej strony internetowej.

## 4. Struktura Projektu
Projekt składa się z następujących plików i folderów:
*   `index.html`: Główny plik HTML definiujący strukturę strony, zawierający formularz przesyłania i galerię.
*   `styles.css`: Plik CSS odpowiedzialny za wygląd i stylizację aplikacji, w tym responsywność i animacje.
*   `script.js`: Skrypt JavaScript po stronie klienta, obsługujący interakcje użytkownika (wybór plików, wyświetlanie statusu przesyłania) oraz komunikację z backendem.
*   `backend/`: Folder zawierający kod serwera Node.js.
    *   `backend/package.json`: Definicje projektu Node.js i zależności.
    *   `backend/server.js`: Główny plik serwera Node.js, obsługujący żądania HTTP i przesyłanie plików.
    *   `backend/fly.toml`: Plik konfiguracyjny dla wdrożenia na Fly.io (zostanie wygenerowany automatycznie).

## 5. Konfiguracja i Wdrożenie

### Wymagania Wstępne
*   Konto GitHub.
*   Konto Fly.io.
*   Zainstalowane Node.js i npm na lokalnym komputerze.
*   Zainstalowany `flyctl` (narzędzie linii komend Fly.io).

### Krok 1: Przygotowanie Repozytorium GitHub
1.  Utwórz nowe, publiczne repozytorium na GitHub.
2.  Sklonuj repozytorium na swój komputer.
3.  Umieść pliki `index.html`, `styles.css`, `script.js` oraz cały folder `backend` w sklonowanym repozytorium.
4.  Wypchnij zmiany do zdalnego repozytorium na GitHub.

### Krok 2: Wdrożenie Frontendu na GitHub Pages
1.  W ustawieniach swojego repozytorium na GitHub, przejdź do sekcji "Pages".
2.  Wybierz gałąź `main` (lub `master`) jako źródło i folder `/ (root)`.
3.  Zapisz zmiany. Po kilku minutach Twoja strona będzie dostępna pod adresem `https://<nazwa-uzytkownika>.github.io/<nazwa-repozytorium>/`.

### Krok 3: Wdrożenie Backendu na Fly.io
1.  Zaloguj się do Fly.io w terminalu za pomocą komendy `fly auth login`.
2.  W terminalu, przejdź do folderu `backend`.
3.  Uruchom komendę `fly launch`. Spowoduje to automatyczne wykrycie aplikacji Node.js i wygenerowanie pliku `fly.toml`.
4.  W trakcie konfiguracji, zgódź się na utworzenie bazy danych Postgres (nie będziemy jej używać, ale jest to standardowy krok).
5.  Po zakończeniu `fly launch`, utwórz trwały wolumin na pliki za pomocą komendy `fly volumes create <nazwa-woluminu> --region <region> --size 3` (np. `fly volumes create uploads --region waw --size 3`).
6.  W pliku `fly.toml`, dodaj sekcję `[mounts]`, aby połączyć wolumin z aplikacją:
    ```toml
    [mounts]
      source="uploads"
      destination="/app/uploads"
    ```
7.  Wdróż aplikację za pomocą komendy `fly deploy`. Po zakończeniu, otrzymasz publiczny URL dla Twojego backendu.

### Krok 4: Połączenie Frontendu z Backendem
1.  W pliku `script.js`, zaktualizuj zmienną z adresem URL Twojego backendu na Fly.io.
2.  Wypchnij zmiany do repozytorium GitHub. GitHub Pages automatycznie zaktualizuje Twoją stronę.
