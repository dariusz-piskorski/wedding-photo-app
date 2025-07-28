exports.handler = async function(event, context) {
    const { Buffer } = require('buffer'); // Jawny import Buffer
    const DROPBOX_TOKEN = process.env.DROPBOX_API_TOKEN; // Pobierz token z zmiennych środowiskowych Netlify
    console.log('DROPBOX_API_TOKEN (masked):', DROPBOX_TOKEN ? DROPBOX_TOKEN.substring(0, 5) + '...' : 'Not set');

    if (!DROPBOX_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Błąd konfiguracji: Brak tokenu Dropbox API.' }),
        };
    }

    try {
        // Krok 1: Pobierz listę plików z folderu aplikacji Dropbox
        const listFilesUrl = 'https://api.dropboxapi.com/2/files/list_folder';
        const listFilesPayload = {
            path: '', // Pusta ścieżka oznacza folder główny aplikacji
            recursive: false,
            include_media_info: false,
            include_deleted: false,
            include_has_explicit_shared_members: false,
            include_mounted_folders: true,
            include_non_downloadable_files: false
        };

        const listFilesResponse = await fetch(listFilesUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + DROPBOX_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(listFilesPayload),
        });

        const listFilesData = await listFilesResponse.json();

        if (!listFilesResponse.ok) {
            return {
                statusCode: listFilesResponse.status,
                body: JSON.stringify({ message: listFilesData.error_summary || 'Błąd podczas listowania plików Dropbox' }),
            };
        }

        const files = listFilesData.entries.filter(entry => entry['.tag'] === 'file');

        const images = [];
        for (const file of files) {
            // Krok 2: Pobierz miniaturę (base64)
            const getThumbnailUrl = 'https://api.dropboxapi.com/2/files/get_thumbnail_v2';
            const getThumbnailPayload = {
                resource: {
                    '.tag': 'path',
                    path: file.path_lower
                },
                format: 'jpeg',
                size: 'w640h480', // Rozmiar miniatury
                mode: 'strict'
            };

            const thumbnailResponse = await fetch(getThumbnailUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + DROPBOX_TOKEN,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(getThumbnailPayload),
            });

            let thumbnailData = null;
            if (thumbnailResponse.ok) {
                // Miniatura jest zwracana jako binarna, musimy ją zakodować do base64
                const arrayBuffer = await thumbnailResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer); // Użyj Node.js Buffer
                thumbnailData = buffer.toString('base64');
            } else {
                console.error(`Błąd podczas pobierania miniatury dla ${file.name}:`, await thumbnailResponse.text());
            }

            // Krok 3: Wygeneruj tymczasowy link do pełnego rozmiaru
            const getTemporaryLinkUrl = 'https://api.dropboxapi.com/2/files/get_temporary_link';
            const getTemporaryLinkPayload = {
                path: file.path_lower
            };

            const fullSizeLinkResponse = await fetch(getTemporaryLinkUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + DROPBOX_TOKEN,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(getTemporaryLinkPayload),
            });

            let fullSizeUrl = null;
            if (fullSizeLinkResponse.ok) {
                const fullSizeLinkData = await fullSizeLinkResponse.json();
                fullSizeUrl = fullSizeLinkData.link;
            } else {
                console.error(`Błąd podczas generowania linku pełnego rozmiaru dla ${file.name}:`, await fullSizeLinkResponse.text());
            }

            if (thumbnailData && fullSizeUrl) {
                images.push({
                    name: file.name,
                    thumbnailData: thumbnailData,
                    fullSizeUrl: fullSizeUrl
                });
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ images }),
        };

    } catch (error) {
        console.error('Błąd funkcji Netlify (get-dropbox-images):', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Wystąpił błąd serwera podczas pobierania obrazów.', error: error.message }),
        };
    }
};
