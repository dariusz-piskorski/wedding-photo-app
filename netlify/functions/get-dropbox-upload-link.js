const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { authorization } = event.headers;

    if (!authorization) {
        return { statusCode: 401, body: 'Unauthorized' };
    }

    const token = authorization.split(' ')[1];

    try {
        const response = await fetch('https://content.dropboxapi.com/2/files/upload_session/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    close: false
                })
            },
            body: '' // Start the session without any data
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Dropbox API Error:', errorBody);
            return { statusCode: response.status, body: `Dropbox API Error: ${errorBody}` };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify({ session_id: data.session_id })
        };
    } catch (error) {
        console.error('Server Error:', error);
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
};