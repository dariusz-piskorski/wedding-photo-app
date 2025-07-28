const fetch = require('node-fetch');

// Funkcja do uzyskiwania nowego tokenu dostępowego przy użyciu refresh tokena
async function getAccessToken() {
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
    const appKey = process.env.DROPBOX_APP_KEY;
    const appSecret = process.env.DROPBOX_APP_SECRET;

    if (!refreshToken || !appKey || !appSecret) {
        throw new Error('Brak konfiguracji: Zmienne środowiskowe Dropbox (REFRESH_TOKEN, APP_KEY, APP_SECRET) nie są ustawione.');
    }

    const tokenUrl = 'https://api.dropboxapi.com/oauth2/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    // Dropbox wymaga autoryzacji Basic z kluczem i sekretem aplikacji
    const basicAuth = Buffer.from(`${appKey}:${appSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Dropbox token refresh error response:', data);
        throw new Error(`Błąd odświeżania tokenu Dropbox: ${data.error_description || 'Nieznany błąd'}`);
    }

    return data.access_token;
}

exports.handler = async function(event, context) {
    try {
        // 1. Zawsze uzyskuj świeży, krótkoterminowy token dostępowy
        const accessToken = await getAccessToken();

        const { page = 1, limit = 10 } = event.queryStringParameters; // Używamy paginacji zamiast kursora
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        let allFiles = [];
        let cursor = null;
        let has_more_dropbox = true; // Zmienna do śledzenia paginacji Dropboxa

        // 2. Pobierz WSZYSTKIE pliki z folderu, obsługując paginację Dropboxa
        while (has_more_dropbox) {
            const apiEndpoint = cursor
                ? 'https://api.dropboxapi.com/2/files/list_folder/continue'
                : 'https://api.dropboxapi.com/2/files/list_folder';
            const apiPayload = cursor
                ? { cursor: cursor }
                : { path: '/slubne-wspomnienia-gallery/', recursive: false, include_media_info: false };

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(`Błąd API Dropbox: ${data.error_summary || 'Nieznany błąd'}`);

            const imageFiles = data.entries.filter(entry =>
                entry['.tag'] === 'file' && /\.(jpe?g|png|gif|bmp|webp)$/i.test(entry.name)
            );
            allFiles.push(...imageFiles);

            cursor = data.cursor;
            has_more_dropbox = data.has_more;
        }

        // 3. Posortuj wszystkie pliki malejąco (od najnowszych do najstarszych)
        // Zakładamy, że nazwa pliku zaczyna się od znacznika czasu YYYYMMDD_HHMMSS
        // Jeśli nazwa pliku nie zawiera daty, można użyć file.server_modified
        allFiles.sort((a, b) => b.name.localeCompare(a.name));

        // 4. Oblicz paginację dla klienta
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = pageNum * limitNum;
        const paginatedFiles = allFiles.slice(startIndex, endIndex);
        const hasMorePages = endIndex < allFiles.length;

        // 5. Wygeneruj linki tymczasowe tylko dla potrzebnej partii
        const imagePromises = paginatedFiles.map(async (file) => {
            const getTemporaryLinkUrl = 'https://api.dropboxapi.com/2/files/get_temporary_link';
            const linkResponse = await fetch(getTemporaryLinkUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: file.path_lower }),
            });
            if (linkResponse.ok) {
                const linkData = await linkResponse.json();
                return { name: file.name, url: linkData.link };
            }
            console.error(`Failed to get temp link for ${file.name}:`, await linkResponse.text());
            return null;
        });

        const images = (await Promise.all(imagePromises)).filter(img => img !== null);

        // 6. Zwróć odpowiedź
        return {
            statusCode: 200,
            body: JSON.stringify({
                images: images,
                has_more: hasMorePages, // Informuje klienta, czy są kolejne strony
                next_page: hasMorePages ? pageNum + 1 : null
            }),
        };

    } catch (error) {
        console.error('FUNCTION ERROR:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message || 'Wystąpił krytyczny błąd serwera.' }),
        };
    }
};