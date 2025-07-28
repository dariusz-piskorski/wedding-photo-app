exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const dropboxToken = process.env.DROPBOX_TOKEN;

    if (!dropboxToken) {
        return { statusCode: 500, body: 'Dropbox token not configured.' };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ token: dropboxToken })
    };
};