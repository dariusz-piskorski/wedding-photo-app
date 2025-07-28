exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
            headers: {
                'Allow': 'POST',
            },
        };
    }

    const DROPBOX_TOKEN = process.env.DROPBOX_API_TOKEN; // Pobierz token z zmiennych środowiskowych Netlify
    console.log('DROPBOX_API_TOKEN (masked):', DROPBOX_TOKEN ? DROPBOX_TOKEN.substring(0, 5) + '...' : 'Not set');

    if (!DROPBOX_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Błąd konfiguracji: Brak tokenu Dropbox API.' }),
        };
    }

    try {
        const { filename } = JSON.parse(event.body);

        const dropboxApiUrl = 'https://api.dropboxapi.com/2/files/get_temporary_upload_link';

        const dropboxRequestPayload = {
            commit_info: {
                path: '/' + filename,
                mode: 'add',
                autorename: true,
                mute: false
            },
            duration: 3600 // Link ważny przez 1 godzinę
        };

        const response = await fetch(dropboxApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + DROPBOX_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dropboxRequestPayload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: responseData.error_summary || 'Błąd Dropbox API' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ uploadUrl: responseData.link }),
        };

    } catch (error) {
        console.error('Błąd funkcji Netlify:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Wystąpił błąd serwera.', error: error.message }),
        };
    }
};
