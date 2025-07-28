document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const statusDiv = document.getElementById('status');
    const galleryGrid = document.querySelector('.gallery-grid');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const downloadButton = document.getElementById('downloadButton');
    const closeButton = document.querySelector('.close-button');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');

    // Elementy okna postępu
    const uploadOverlay = document.getElementById('uploadOverlay');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const progressBar = document.getElementById('progressBar');

    // Zmienne stanu dla nieskończonego przewijania i lightboxa
    let currentCursor = null;
    let hasMoreImages = true;
    let isLoadingImages = false;
    const imagesPerLoad = 10; // Liczba obrazów ładowanych jednorazowo
    let allGalleryImages = []; // Przechowuje wszystkie załadowane obrazy do nawigacji
    let currentImageIndex = 0; // Indeks aktualnie wyświetlanego obrazu w lightboxie

    // Funkcja do ładowania obrazów do galerii
    async function loadGalleryImages(append = false) {
        if (isLoadingImages || !hasMoreImages) return; // Zapobiegaj wielokrotnemu ładowaniu

        isLoadingImages = true;
        loadingIndicator.style.display = 'block'; // Pokaż wskaźnik ładowania

        if (!append) {
            galleryGrid.innerHTML = ''; // Wyczyść galerię tylko przy pierwszym ładowaniu
            currentCursor = null; // Zresetuj kursor
            hasMoreImages = true; // Zresetuj flagę
            allGalleryImages = []; // Wyczyść listę obrazów przy nowym ładowaniu
        }

        try {
            let url = '/.netlify/functions/get-dropbox-images';
            const params = new URLSearchParams();
            params.append('limit', imagesPerLoad);
            if (currentCursor) {
                params.append('cursor', currentCursor);
            }
            url += `?${params.toString()}`;

            const response = await fetch(url);
            if (!response.ok) {
                // Spróbuj odczytać treść błędu z odpowiedzi, aby uzyskać więcej szczegółów
                const errorData = await response.json().catch(() => null); // .catch na wypadek gdyby odpowiedź nie była JSONem
                const errorMessage = errorData ? errorData.message : response.statusText;
                throw new Error(`Błąd funkcji Netlify (galeria): ${errorMessage}`);
            }
            const data = await response.json();
            console.log('FRONTEND LOG: Data received from get-dropbox-images:', data);
            const images = data.images;

            if (images.length === 0 && !append) {
                galleryGrid.innerHTML = '<p class="no-images-message">Brak zdjęć w galerii. Bądź pierwszym, który coś doda!</p>';
            } else if (images.length === 0 && append) {
                // Brak nowych obrazów do dodania
            }

            allGalleryImages = allGalleryImages.concat(images); // Dodaj nowe obrazy do globalnej listy

            images.forEach((image, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('gallery-item');

                const img = document.createElement('img');
                                img.src = image.url; // Użyj bezpośredniego URL do obrazu
                img.alt = image.name;
                img.loading = 'lazy'; // Lazy loading

                // Obsługa kliknięcia na miniaturkę
                img.addEventListener('click', () => {
                    currentImageIndex = allGalleryImages.indexOf(image); // Ustaw indeks klikniętego obrazu
                    showImageInLightbox(currentImageIndex);
                });

                imgContainer.appendChild(img);
                galleryGrid.appendChild(imgContainer);
            });

            

            currentCursor = data.cursor; // Użyj kursora z odpowiedzi Dropboxa
            hasMoreImages = data.has_more; // Użyj has_more z odpowiedzi Dropboxa

        } catch (error) {
            console.error('Błąd ładowania galerii:', error);
            if (!append) {
                galleryGrid.innerHTML = '<p class="error-message">Nie udało się załadować galerii. Spróbuj odświeżyć stronę.</p>';
            }
        } finally {
            isLoadingImages = false;
            // Pokaż wskaźnik ładowania tylko jeśli są jeszcze obrazy do załadowania
            if (hasMoreImages) {
                loadingIndicator.style.display = 'block';
            } else {
                loadingIndicator.style.display = 'none';
            }
        }
    }

    // Funkcja do wyświetlania obrazu w lightboxie
    function showImageInLightbox(index) {
        if (index < 0 || index >= allGalleryImages.length) return; // Sprawdź granice

        currentImageIndex = index; // <--- TA LINIA ZOSTAŁA DODANA

        const image = allGalleryImages[index];
        lightboxImage.src = image.url;
        downloadButton.href = image.url;
        downloadButton.download = image.name;
        lightbox.classList.add('active');

        // Pokaż/ukryj strzałki nawigacyjne
        prevButton.style.display = (currentImageIndex > 0) ? 'flex' : 'none';
        nextButton.style.display = (currentImageIndex < allGalleryImages.length - 1) ? 'flex' : 'none';
    }

    // Obsługa nawigacji w lightboxie
    prevButton.addEventListener('click', () => {
        showImageInLightbox(currentImageIndex - 1);
    });

    nextButton.addEventListener('click', () => {
        showImageInLightbox(currentImageIndex + 1);
    });

    // Intersection Observer dla nieskończonego przewijania
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreImages && !isLoadingImages) {
            loadGalleryImages(true); // Załaduj więcej obrazów, jeśli wskaźnik jest widoczny
        }
    }, {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1 // Wykryj, gdy 10% wskaźnika jest widoczne
    });

    // Obserwuj wskaźnik ładowania
    observer.observe(loadingIndicator);

    // Logika przycisku "Wróć na górę"
    const backToTopBtn = document.getElementById('backToTopBtn');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) { // Pokaż przycisk po przewinięciu 300px
            backToTopBtn.classList.add('show');
            backToTopBtn.style.display = 'flex'; // Użyj flex, aby wyśrodkować ikonę
        } else {
            backToTopBtn.classList.remove('show');
            // backToTopBtn.style.display = 'none'; // Ukryj po animacji
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // Płynne przewijanie
        });
    });

    // Zamknij lightbox po kliknięciu na przycisk zamknięcia
    closeButton.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    // Zamknij lightbox po kliknięciu poza obrazem
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    // Załaduj galerię przy starcie
    loadGalleryImages();

    uploadButton.addEventListener('click', () => {
        fileInput.click(); // Symuluj kliknięcie na ukrytym polu input
    });

    fileInput.addEventListener('change', async () => {
        const files = fileInput.files;
        if (files.length === 0) {
            return;
        }

        uploadOverlay.classList.add('active');
        statusDiv.textContent = '';

        const totalFiles = files.length;
        let filesUploaded = 0;

        try {
            const token = await getDropboxToken();
            console.log('FRONTEND LOG: Token received from getDropboxToken:', token);

            for (let i = 0; i < totalFiles; i++) {
                const file = files[i];
                const now = new Date();
                const timestamp = now.getFullYear().toString() +
                                  (now.getMonth() + 1).toString().padStart(2, '0') +
                                  now.getDate().toString().padStart(2, '0') +
                                  '_' +
                                  now.getHours().toString().padStart(2, '0') +
                                  now.getMinutes().toString().padStart(2, '0') +
                                  now.getSeconds().toString().padStart(2, '0');
                const newFilename = `${timestamp}_${file.name}`;

                uploadProgressText.textContent = `Przesyłanie wspomnień ${i + 1} z ${totalFiles}: ${file.name}`;

                // Krok 1: Rozpocznij sesję wysyłania
                const sessionResponse = await fetch('/.netlify/functions/get-dropbox-upload-link', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!sessionResponse.ok) {
                    throw new Error(`Błąd przy rozpoczynaniu sesji: ${await sessionResponse.text()}`);
                }
                const sessionData = await sessionResponse.json();
                const sessionId = sessionData.session_id;

                // Krok 2: Wyślij plik w całości
                const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/append_v2', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/octet-stream',
                        'Dropbox-API-Arg': JSON.stringify({
                            cursor: { session_id: sessionId, offset: 0 },
                            close: false
                        })
                    },
                    body: file
                });

                if (!uploadResponse.ok) {
                    throw new Error(`Błąd podczas wysyłania pliku: ${await uploadResponse.text()}`);
                }

                // Krok 3: Zakończ sesję wysyłania
                const finishResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/finish', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/octet-stream',
                        'Dropbox-API-Arg': JSON.stringify({
                            cursor: { session_id: sessionId, offset: file.size },
                            commit: { path: `/slubne-wspomnienia-gallery/${newFilename}`, mode: 'add', autorename: true, mute: false }
                        })
                    },
                    body: ''
                });

                if (!finishResponse.ok) {
                    throw new Error(`Błąd przy finalizowaniu wysyłania: ${await finishResponse.text()}`);
                }

                filesUploaded++;
                const progress = (filesUploaded / totalFiles) * 100;
                progressBar.style.width = `${progress}%`;
            }

            uploadProgressText.textContent = 'Wszystkie wspomnienia zostały pomyślnie przesłane!';
            
            // Pokaż przycisk potwierdzenia zamiast automatycznego zamykania
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Gotowe!';
            confirmButton.classList.add('confirm-upload-button'); // Dodaj klasę dla stylizacji
            uploadProgressText.appendChild(confirmButton); // Dodaj przycisk pod tekstem statusu

            confirmButton.addEventListener('click', async () => {
                uploadOverlay.classList.remove('active');
                progressBar.style.width = '0%';
                progressBar.style.backgroundColor = 'var(--primary-green)'; // Reset koloru paska
                confirmButton.remove(); // Usuń przycisk po kliknięciu
                currentCursor = null; // Zresetuj kursor, aby odświeżyć galerię
                hasMoreImages = true;
                await loadGalleryImages(); // Odśwież galerię po zamknięciu okna
            });

        } catch (error) {
            uploadProgressText.textContent = `Błąd: ${error.message}`;
            progressBar.style.backgroundColor = '#d9534f';
            setTimeout(() => {
                uploadOverlay.classList.remove('active');
                progressBar.style.backgroundColor = 'var(--primary-green)';
            }, 4000);
        }
    });

    async function getDropboxToken() {
        // Ta funkcja powinna bezpiecznie pobierać token, np. z innej funkcji Netlify
        // Na potrzeby tego przykładu, zakładamy, że token jest dostępny po stronie klienta (co NIE jest bezpieczne w produkcji)
        // W rzeczywistym scenariuszu, token powinien być zarządzany wyłącznie po stronie serwera.
        const response = await fetch('/.netlify/functions/get-dropbox-token'); // Załóżmy, że masz taką funkcję
        if (!response.ok) {
            throw new Error('Nie można pobrać tokena Dropbox');
        }
        const data = await response.json();
        return data.token;
    }
});