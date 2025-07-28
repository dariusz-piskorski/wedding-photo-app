const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN } = process.env;

    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET || !DROPBOX_REFRESH_TOKEN) {
        return { statusCode: 500, body: 'Dropbox environment variables not configured.' };
    }

    const tokenUrl = 'https://api.dropbox.com/oauth2/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', DROPBOX_REFRESH_TOKEN);
    params.append('client_id', DROPBOX_APP_KEY);
    params.append('client_secret', DROPBOX_APP_SECRET);

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Dropbox API Error:', errorBody);
            return { statusCode: response.status, body: `Dropbox API Error: ${errorBody}` };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify({ token: data.access_token })
        };
    } catch (error) {
        console.error('Server Error:', error);
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
};
