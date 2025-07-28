exports.handler = async function(event, context) {
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

        // Krok 2: Dla każdego pliku, wygeneruj tymczasowy link bezpośredni
        const images = [];
        for (const file of files) {
            const getTemporaryLinkUrl = 'https://api.dropboxapi.com/2/files/get_temporary_link';
            const getTemporaryLinkPayload = {
                path: file.path_lower
            };

            const getTemporaryLinkResponse = await fetch(getTemporaryLinkUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + DROPBOX_TOKEN,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(getTemporaryLinkPayload),
            });

            const getTemporaryLinkData = await getTemporaryLinkResponse.json();

            if (getTemporaryLinkResponse.ok) {
                images.push({
                    name: file.name,
                    url: getTemporaryLinkData.link,
                    thumbnail: getTemporaryLinkData.link // W Dropboxie tymczasowy link jest już bezpośredni
                });
            } else {
                console.error(`Błąd podczas generowania linku dla ${file.name}:`, getTemporaryLinkData.error_summary);
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
