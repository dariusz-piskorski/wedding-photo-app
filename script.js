document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const statusDiv = document.getElementById('status');
    const galleryGrid = document.querySelector('.gallery-grid');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const downloadButton = document.getElementById('downloadButton');
    const closeButton = document.querySelector('.close-button');

    // Elementy okna postępu
    const uploadOverlay = document.getElementById('uploadOverlay');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const progressBar = document.getElementById('progressBar');

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
                img.src = image.url; // Użyj bezpośredniego URL do obrazu
                img.alt = image.name;
                img.loading = 'lazy'; // Lazy loading

                // Obsługa kliknięcia na miniaturkę
                img.addEventListener('click', () => {
                    lightbox.classList.add('active'); // Pokaż lightbox
                    lightboxImage.src = image.url; // Ustaw pełny obraz (ten sam URL)
                    downloadButton.href = image.url; // Ustaw link do pobrania
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
            return;
        }

        // Pokaż okno postępu
        uploadOverlay.classList.add('active');
        statusDiv.textContent = ''; // Wyczyść stary status

        const totalFiles = files.length;
        let filesUploaded = 0;

        for (let i = 0; i < totalFiles; i++) {
            const file = files[i];
            uploadProgressText.textContent = `Przesyłanie pliku ${i + 1} z ${totalFiles}: ${file.name}`;

            try {
                // Krok 1: Uzyskaj link do wysyłki
                const response = await fetch('/.netlify/functions/get-dropbox-upload-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: file.name }),
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
                uploadProgressText.textContent = `Błąd przy pliku ${file.name}: ${error.message}`;
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
        uploadProgressText.textContent = 'Wszystkie pliki zostały pomyślnie przesłane!';
        
        // Poczekaj chwilę, aby użytkownik zobaczył komunikat o sukcesie
        setTimeout(async () => {
            uploadOverlay.classList.remove('active');
            await loadGalleryImages(); // Odśwież galerię RAZ, po wszystkim
            // Zresetuj stan paska postępu na następny raz
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 500);
        }, 2000);
    });
});