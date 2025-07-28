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
    const imagesPerLoad = 20; // Liczba obrazów ładowanych jednorazowo
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

            // Upewnij się, że loadingIndicator jest ostatnim elementem w galleryGrid
            if (loadingIndicator.parentNode !== galleryGrid) {
                galleryGrid.appendChild(loadingIndicator);
            }

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

        // Pokaż okno postępu
        uploadOverlay.classList.add('active');
        statusDiv.textContent = ''; // Wyczyść stary status

        const totalFiles = files.length;
        let filesUploaded = 0;

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

            try {
                // Krok 1: Uzyskaj link do wysyłki
                const response = await fetch('/.netlify/functions/get-dropbox-upload-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: newFilename }), // Użyj nowej nazwy pliku z timestampem
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Błąd serwera: ${errorData.message || response.statusText}`);
                }

                const data = await response.json();
                const uploadUrl = data.uploadUrl;

                // Krok 2: Wyślij plik do Dropbox
                const dropboxResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: file,
                });

                if (!dropboxResponse.ok) {
                    throw new Error(`Błąd wysyłania do Dropbox: ${await dropboxResponse.text()}`);
                }

                filesUploaded++;
                const progress = (filesUploaded / totalFiles) * 100;
                progressBar.style.width = `${progress}%`;

            } catch (error) {
                uploadProgressText.textContent = `Błąd przy wspomnieniu ${file.name}: ${error.message}`;
                progressBar.style.backgroundColor = '#d9534f'; // Czerwony kolor dla błędu
                // Poczekaj chwilę, aby użytkownik zobaczył błąd, a następnie zamknij okno
                setTimeout(() => {
                    uploadOverlay.classList.remove('active');
                    progressBar.style.backgroundColor = 'var(--primary-green)'; // Reset koloru
                }, 4000);
                return; // Przerwij proces
            }
        }

        // Zakończenie sukcesem
        uploadProgressText.textContent = 'Wszystkie wspomnienia zostały pomyślnie przesłane!';
        
        // Poczekaj chwilę, aby użytkownik zobaczył komunikat o sukcesie
        setTimeout(async () => {
            uploadOverlay.classList.remove('active');
            // Zresetuj stan paginacji przed odświeżeniem galerii
            currentCursor = null;
            hasMoreImages = true;
            await loadGalleryImages(); // Odśwież galerię RAZ, po wszystkim
            // Zresetuj stan paska postępu na następny raz
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 500);
        }, 2000);
    });
});