const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    console.log('FUNCTION LOG: DROPBOX_API_TOKEN (masked):', process.env.DROPBOX_API_TOKEN ? process.env.DROPBOX_API_TOKEN.substring(0, 5) + '...' : 'Not set');

    if (!process.env.DROPBOX_API_TOKEN) {
        console.error('FUNCTION ERROR: DROPBOX_API_TOKEN is not set.');
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
        };

        console.log('FUNCTION LOG: Sending list_folder request to Dropbox.');
        const listFilesResponse = await fetch(listFilesUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.DROPBOX_API_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(listFilesPayload),
        });

        const listFilesData = await listFilesResponse.json();
        if (!listFilesResponse.ok) {
            console.error('FUNCTION ERROR: list_folder failed.', listFilesData);
            return {
                statusCode: listFilesResponse.status,
                body: JSON.stringify({ message: listFilesData.error_summary || 'Błąd podczas listowania plików Dropbox' }),
            };
        }

        const files = listFilesData.entries.filter(entry => entry['.tag'] === 'file');
        console.log('FUNCTION LOG: Found files:', files.length);

        const imagePromises = files.map(async (file) => {
            // Krok 2: Dla każdego pliku wygeneruj tymczasowy link do pełnego rozmiaru
            const getTemporaryLinkUrl = 'https://api.dropboxapi.com/2/files/get_temporary_link';
            const getTemporaryLinkPayload = { path: file.path_lower };

            console.log(`FUNCTION LOG: Sending get_temporary_link request for: ${file.name}`);
            const linkResponse = await fetch(getTemporaryLinkUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + process.env.DROPBOX_API_TOKEN,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(getTemporaryLinkPayload),
            });

            if (linkResponse.ok) {
                const linkData = await linkResponse.json();
                console.log(`FUNCTION LOG: Link generated for: ${file.name}`);
                return {
                    name: file.name,
                    url: linkData.link, // Zwracamy bezpośredni link
                };
            } else {
                console.error(`FUNCTION ERROR: Failed to get link for ${file.name}:`, await linkResponse.text());
                return null; // Zwróć null w przypadku błędu
            }
        });

        // Poczekaj na wszystkie promisy i odfiltruj te, które zwróciły null
        const images = (await Promise.all(imagePromises)).filter(img => img !== null);

        console.log('FUNCTION LOG: Returning images count:', images.length);
        return {
            statusCode: 200,
            body: JSON.stringify({ images }),
        };

    } catch (error) {
        console.error('FUNCTION ERROR: Uncaught error in get-dropbox-images:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Wystąpił błąd serwera podczas pobierania obrazów.', error: error.message }),
        };
    }
};