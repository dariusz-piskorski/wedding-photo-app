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
*   **Przesyłanie Plików:** Goście mogą przesyłać zdjęcia i filmy bez konieczności logowania. Obsługa wielu plików jednocześnie. Podczas przesyłania wyświetlany jest szczegółowy status postępu.
*   **Galeria Wspomnień:** Dynamicznie ładowana galeria wyświetlająca wszystkie przesłane zdjęcia i filmy w czasie rzeczywistym, z miniaturami dla szybszego ładowania.
*   **Lazy Loading Obrazów:** Miniatury w galerii są ładowane asynchronicznie (tylko gdy są widoczne w obszarze widoku), co znacznie przyspiesza początkowe ładowanie strony i poprawia wydajność.
*   **Podgląd i Pobieranie:** Możliwość powiększenia zdjęcia w trybie pełnoekranowym (lightbox) oraz pobrania pojedynczego pliku.
*   **Wskaźniki Ładowania:** Podczas operacji przesyłania plików, strona informuje o postępie.
*   **Responsywny Design:** Pełna responsywność (mobile-first) zapewniająca komfortowe użytkowanie na różnych urządzeniach. Nowoczesny i elegancki wygląd z motywem butelkowej zieleni i ikonami Font Awesome.

## 3. Technologie
*   **Frontend:** HTML5, CSS3, JavaScript (z Font Awesome do ikon) - do budowy interfejsu użytkownika.
*   **Backend (API):** Netlify Functions (JavaScript/Node.js) - służy do bezpiecznego generowania tymczasowych linków do przesyłania plików na Dropbox oraz pobierania listy plików i miniatur.
*   **Przechowywanie Plików:** Dropbox API - do przechowywania przesłanych zdjęć i filmów.
*   **Hosting Frontendu i Funkcji:** Netlify - darmowy hosting dla statycznej strony internetowej i funkcji serverless.
*   **Kontrola Wersji:** Git i GitHub.

## 4. Struktura Projektu
Projekt składa się z następujących plików i folderów:
*   `index.html`: Główny plik HTML definiujący strukturę strony, zawierający formularz przesyłania i galerię.
*   `styles.css`: Plik CSS odpowiedzialny za wygląd i stylizację aplikacji, w tym responsywność i animacje.
*   `script.js`: Skrypt JavaScript po stronie klienta, obsługujący interakcje użytkownika (wybór plików, wyświetlanie statusu przesyłania, galeria, lightbox) oraz komunikację z funkcjami Netlify.
*   `netlify/functions/`: Folder zawierający kod funkcji Netlify.
    *   `netlify/functions/get-dropbox-upload-link.js`: Funkcja generująca tymczasowy link do wysyłki pliku na Dropbox.
    *   `netlify/functions/get-dropbox-images.js`: Funkcja pobierająca listę plików z Dropboxa i generująca tymczasowe linki do wyświetlania w galerii (w tym miniatury).

## 5. Konfiguracja i Wdrożenie

### Wymagania Wstępne
*   Konto GitHub.
*   Konto Dropbox (do przechowywania plików).
*   Konto Netlify (do hostingu strony i funkcji).
*   Zainstalowany Git na lokalnym komputerze.

### Krok 1: Przygotowanie Repozytorium GitHub
1.  Sklonuj repozytorium na swój komputer.
2.  Upewnij się, że wszystkie pliki (`index.html`, `styles.css`, `script.js`, `netlify/functions/get-dropbox-upload-link.js`, `netlify/functions/get-dropbox-images.js`) znajdują się w głównym katalogu repozytorium.
3.  Wypchnij zmiany do zdalnego repozytorium na GitHub.

### Krok 2: Konfiguracja Dropbox API
1.  Wejdź na [https://www.dropbox.com/developers/apps/create](https://www.dropbox.com/developers/apps/create).
2.  Wybierz "Scoped access".
3.  Wybierz "App folder" (najbezpieczniejsza opcja).
4.  Nazwij swoją aplikację (np. "WeddingWebUploader").
5.  W zakładce "Permissions" zaznacz `files.content.write` (dla przesyłania) i `files.content.read` (dla galerii).
6.  W zakładce "Settings" wygeneruj token dostępu (Access token). **Skopiuj ten token.** Będzie on potrzebny w Netlify.

### Krok 3: Wdrożenie na Netlify
1.  Zaloguj się do Netlify na [https://app.netlify.com/](https://app.netlify.com/).
2.  Kliknij "Add new site" -> "Import an existing project".
3.  Wybierz "GitHub" i połącz z Twoim repozytorium.
4.  Na ekranie konfiguracji wdrożenia:
    *   **Branch to deploy:** `main` (lub `master`).
    *   **Base directory:** (pozostaw puste).
    *   **Build command:** (pozostaw puste).
    *   **Publish directory:** (pozostaw puste).
5.  **Ustaw zmienną środowiskową dla tokena Dropbox:**
    *   Kliknij "Show advanced" -> "New environment variable".
    *   **Key:** `DROPBOX_API_TOKEN` (dokładnie tak, wielkość liter ma znaczenie!).
    *   **Value:** Wklej tutaj swój token Dropbox API skopiowany w Kroku 2.
    *   **Scope:** Upewnij się, że jest ustawione na "All contexts".
6.  Kliknij "Deploy site". Netlify automatycznie wdroży Twoją stronę i funkcje.

## 6. Użycie Aplikacji
1.  Otwórz adres URL swojej witryny Netlify (np. `https://slubne-wspomnienia.netlify.app/`).
2.  **Przesyłanie zdjęć:** Kliknij "Dodaj wspomnienia", wybierz jeden lub więcej plików i poczekaj na zakończenie przesyłania.
3.  **Przeglądanie galerii:** Przesłane zdjęcia pojawią się automatycznie w "Galerii Wspomnień".
4.  **Powiększanie i pobieranie:** Kliknij na miniaturkę zdjęcia, aby zobaczyć je w powiększeniu. Użyj przycisku "Pobierz", aby zapisać zdjęcie na swoim urządzeniu.

## 7. Dziennik Rozwoju i Kluczowe Zmiany
*   **Początkowa koncepcja:** Aplikacja do udostępniania wspomnień ślubnych.
*   **Zmiana technologii backendu:** Przejście z Fly.io/Node.js na Netlify Functions/Dropbox API w celu zapewnienia darmowego i niezawodnego hostingu plików.
*   **Implementacja przesyłania wielu plików:** Umożliwienie wyboru i wysyłania wielu zdjęć jednocześnie.
*   **Nowy design:** Wdrożenie nowoczesnego, eleganckiego wyglądu z motywem butelkowej zieleni, niestandardowymi czcionkami i responsywnością.
*   **Dynamiczna galeria:** Automatyczne ładowanie i wyświetlanie zdjęć z Dropboxa, z miniaturami dla szybszego ładowania.
*   **Lightbox z pobieraniem:** Funkcjonalność podglądu zdjęć na pełnym ekranie z opcją pobierania.

## 8. Przyszłe Ulepszenia
*   Dodanie paginacji lub nieskończonego przewijania dla bardzo dużych galerii.
*   Możliwość sortowania i filtrowania zdjęć w galerii.
*   Dodanie opcji usuwania zdjęć (wymaga dodatkowej autoryzacji i funkcji).
*   Powiadomienia o zakończeniu przesyłania.
