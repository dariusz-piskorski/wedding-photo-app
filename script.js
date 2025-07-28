
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
    let currentPage = 1;
    let hasMoreImages = true;
    let isLoadingImages = false;
    const imagesPerLoad = 10; 
    let allGalleryImages = []; 
    let currentImageIndex = 0; 

    // Funkcja do ładowania obrazów do galerii
    async function loadGalleryImages(page = 1, append = false) {
        if (isLoadingImages || !hasMoreImages) return;

        isLoadingImages = true;
        loadingIndicator.style.display = 'block';

        if (!append) {
            galleryGrid.innerHTML = '';
            allGalleryImages = [];
            currentPage = 1;
            hasMoreImages = true;
        }

        try {
            const url = `/.netlify/functions/get-dropbox-images?page=${page}&limit=${imagesPerLoad}`;
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData ? errorData.message : response.statusText;
                throw new Error(`Błąd funkcji Netlify (galeria): ${errorMessage}`);
            }
            const data = await response.json();
            const images = data.images;

            if (images.length === 0 && !append) {
                galleryGrid.innerHTML = '<p class="no-images-message">Brak zdjęć w galerii. Bądź pierwszym, który coś doda!</p>';
            }

            allGalleryImages = allGalleryImages.concat(images);

            images.forEach((image) => {
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('gallery-item');

                const img = document.createElement('img');
                img.src = image.url;
                img.alt = image.name;
                img.loading = 'lazy';

                img.addEventListener('click', () => {
                    currentImageIndex = allGalleryImages.indexOf(image);
                    showImageInLightbox(currentImageIndex);
                });

                imgContainer.appendChild(img);
                galleryGrid.appendChild(imgContainer); // Zawsze dodajemy na końcu, bo serwer sortuje
            });

            hasMoreImages = data.has_more;
            if (hasMoreImages) {
                currentPage++;
            }

        } catch (error) {
            console.error('Błąd ładowania galerii:', error);
            if (!append) {
                galleryGrid.innerHTML = '<p class="error-message">Nie udało się załadować galerii. Spróbuj odświeżyć stronę.</p>';
            }
        } finally {
            isLoadingImages = false;
            loadingIndicator.style.display = hasMoreImages ? 'block' : 'none';
        }
    }

    function showImageInLightbox(index) {
        if (index < 0 || index >= allGalleryImages.length) return;

        currentImageIndex = index;
        const image = allGalleryImages[index];
        lightboxImage.src = image.url;
        downloadButton.href = image.url;
        downloadButton.download = image.name;
        lightbox.classList.add('active');

        prevButton.style.display = (currentImageIndex > 0) ? 'flex' : 'none';
        nextButton.style.display = (currentImageIndex < allGalleryImages.length - 1) ? 'flex' : 'none';
    }

    prevButton.addEventListener('click', () => showImageInLightbox(currentImageIndex - 1));
    nextButton.addEventListener('click', () => showImageInLightbox(currentImageIndex + 1));

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreImages && !isLoadingImages) {
            loadGalleryImages(currentPage, true);
        }
    }, { root: null, rootMargin: '0px', threshold: 0.1 });

    observer.observe(loadingIndicator);

    const backToTopBtn = document.getElementById('backToTopBtn');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    closeButton.addEventListener('click', () => lightbox.classList.remove('active'));
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    // Inicjalne ładowanie
    loadGalleryImages(currentPage);

    uploadButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const files = fileInput.files;
        if (files.length === 0) return;

        uploadOverlay.classList.add('active');
        statusDiv.textContent = '';
        let filesUploaded = 0;

        try {
            const token = await getDropboxToken();
            for (let i = 0; i < files.length; i++) {
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

                uploadProgressText.textContent = `Przesyłanie ${i + 1} z ${files.length}: ${file.name}`;
                
                // Używamy jednego wywołania do Dropbox API
                const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/octet-stream',
                        'Dropbox-API-Arg': JSON.stringify({
                            path: `/slubne-wspomnienia-gallery/${newFilename}`,
                            mode: 'add',
                            autorename: true,
                            mute: false
                        })
                    },
                    body: file
                });

                if (!uploadResponse.ok) {
                    throw new Error(`Błąd podczas wysyłania pliku: ${await uploadResponse.text()}`);
                }

                filesUploaded++;
                progressBar.style.width = `${(filesUploaded / files.length) * 100}%`;
            }

            uploadProgressText.textContent = 'Wszystkie wspomnienia zostały pomyślnie przesłane!';
            setTimeout(() => {
                uploadOverlay.classList.remove('active');
                loadGalleryImages(1, false); // Odśwież galerię od początku
                setTimeout(() => progressBar.style.width = '0%', 500);
            }, 2000);

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
        const response = await fetch('/.netlify/functions/get-dropbox-token');
        if (!response.ok) throw new Error('Nie można pobrać tokena Dropbox');
        const data = await response.json();
        return data.token;
    }
});
