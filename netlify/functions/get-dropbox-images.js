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

        const { cursor, limit } = event.queryStringParameters;
        const defaultLimit = 20;
        const fetchLimit = parseInt(limit) || defaultLimit;

        let apiEndpoint;
        let apiPayload;

        // 2. Użyj uzyskanego tokenu do komunikacji z API Dropbox
        if (cursor) {
            apiEndpoint = 'https://api.dropboxapi.com/2/files/list_folder/continue';
            apiPayload = { cursor: cursor };
        } else {
            apiEndpoint = 'https://api.dropboxapi.com/2/files/list_folder';
            apiPayload = {
                path: '/slubne-wspomnienia-gallery/',
                recursive: false,
                limit: fetchLimit,
                include_media_info: false,
                include_deleted: false,
            };
        }

        const listFilesResponse = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload),
        });

        const listFilesData = await listFilesResponse.json();
        if (!listFilesResponse.ok) {
            const errorDetails = listFilesData.error_summary || 'Unknown Dropbox API error';
            console.error('Dropbox API Error:', listFilesData);
            return {
                statusCode: listFilesResponse.status,
                body: JSON.stringify({ message: `Błąd Dropbox API: ${errorDetails}` }),
            };
        }

        const files = listFilesData.entries.filter(entry =>
            entry['.tag'] === 'file' && /\.(jpe?g|png|gif|bmp|webp)$/i.test(entry.name)
        );

        const imagePromises = files.map(async (file) => {
            const getTemporaryLinkUrl = 'https://api.dropboxapi.com/2/files/get_temporary_link';
            const getTemporaryLinkPayload = { path: file.path_lower };

            const linkResponse = await fetch(getTemporaryLinkUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(getTemporaryLinkPayload),
            });

            if (linkResponse.ok) {
                const linkData = await linkResponse.json();
                return { name: file.name, url: linkData.link };
            }
            console.error(`Failed to get temp link for ${file.name}:`, await linkResponse.text());
            return null;
        });

        const images = (await Promise.all(imagePromises)).filter(img => img !== null);

        // Reverse the order of the images
        images.reverse();

        return {
            statusCode: 200,
            body: JSON.stringify({
                images: images,
                cursor: listFilesData.cursor,
                has_more: listFilesData.has_more
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