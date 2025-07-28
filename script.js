document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const statusDiv = document.getElementById('status');
    const galleryGrid = document.querySelector('.gallery-grid');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const downloadButton = document.getElementById('downloadButton');
    const closeButton = document.querySelector('.close-button');

    // Funkcja do ładowania obrazów do galerii
    async function loadGalleryImages() {
        galleryGrid.innerHTML = ''; // Wyczyść placeholdery
        try {
            const response = await fetch('/.netlify/functions/get-dropbox-images');
            if (!response.ok) {
                throw new Error(`Błąd funkcji Netlify (galeria): ${response.statusText}`);
            }
            const data = await response.json();
            console.log('FRONTEND LOG: Data received from get-dropbox-images:', data);
            const images = data.images;

            if (images.length === 0) {
                galleryGrid.innerHTML = '<p class="no-images-message">Brak zdjęć w galerii. Bądź pierwszym, który coś doda!</p>';
                return;
            }

            images.forEach(image => {
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('gallery-item');

                const img = document.createElement('img');
                img.src = `data:image/jpeg;base64,${image.thumbnailData}`; // Użyj danych base64 dla miniatury
                img.alt = image.name;
                img.loading = 'lazy'; // Lazy loading

                // Obsługa kliknięcia na miniaturkę
                img.addEventListener('click', () => {
                    lightbox.classList.add('active'); // Pokaż lightbox
                    lightboxImage.src = image.fullSizeUrl; // Ustaw pełny obraz
                    downloadButton.href = image.fullSizeUrl; // Ustaw link do pobrania
                    downloadButton.download = image.name; // Ustaw nazwę pliku do pobrania
                });

                imgContainer.appendChild(img);
                galleryGrid.appendChild(imgContainer);
            });
        } catch (error) {
            console.error('Błąd ładowania galerii:', error);
            galleryGrid.innerHTML = '<p class="error-message">Nie udało się załadować galerii. Spróbuj odświeżyć stronę.</p>';
        }
    }

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
            statusDiv.textContent = 'Nie wybrano żadnych plików.';
            return;
        }

        statusDiv.textContent = `Przygotowywanie do wysyłki ${files.length} plików...`;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            statusDiv.textContent = `Wysyłanie pliku ${i + 1} z ${files.length}: ${file.name}...`;

            try {
                // Krok 1: Wywołaj funkcję Netlify, aby uzyskać tymczasowy link do wysyłki na Dropbox
                const netlifyFunctionUrl = '/.netlify/functions/get-dropbox-upload-link';
                const response = await fetch(netlifyFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ filename: file.name }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Błąd funkcji Netlify: ${errorData.message || response.statusText}`);
                }

                const data = await response.json();
                const uploadUrl = data.uploadUrl;

                if (!uploadUrl) {
                    throw new Error('Nie otrzymano linku do wysłania z funkcji Netlify.');
                }

                statusDiv.textContent = `Wysyłanie pliku ${i + 1} z ${files.length}: ${file.name} do Dropbox...`;

                // Krok 2: Wyślij plik bezpośrednio do Dropbox
                const dropboxResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                    },
                    body: file,
                });

                if (dropboxResponse.ok) {
                    statusDiv.textContent = `Plik ${i + 1} z ${files.length}: ${file.name} został pomyślnie wysłany!`;
                    // Po pomyślnym wysłaniu, odśwież galerię
                    loadGalleryImages(); 
                } else {
                    const errorText = await dropboxResponse.text();
                    throw new Error(`Błąd wysyłania do Dropbox: ${errorText}`);
                }

            } catch (error) {
                statusDiv.textContent = `Wystąpił błąd podczas wysyłania ${file.name}: ${error.message}`;
                console.error(error);
                break; // Przerwij wysyłanie po pierwszym błędzie
            }
        }
        statusDiv.textContent = 'Wszystkie wybrane pliki zostały przetworzone.';
    });
});