const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const { page = 1, limit = 10 } = event.queryStringParameters;
    const accessToken = process.env.DROPBOX_ACCESS_TOKEN;

    try {
        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: '/slubne-wspomnienia-gallery' }),
        });

        if (!response.ok) {
            throw new Error(`Dropbox API error: ${response.statusText}`);
        }

        const data = await response.json();
        const files = data.entries.filter(entry => entry['.tag'] === 'file');
        const sortedFiles = files.sort((a, b) => new Date(b.server_modified) - new Date(a.server_modified));

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedFiles = sortedFiles.slice(startIndex, endIndex);

        const imagePromises = paginatedFiles.map(async (file) => {
            const linkResponse = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path: file.path_lower }),
            });

            if (linkResponse.ok) {
                const linkData = await linkResponse.json();
                return { name: file.name, url: linkData.link };
            }
            return null;
        });

        const images = (await Promise.all(imagePromises)).filter(img => img !== null);

        return {
            statusCode: 200,
            body: JSON.stringify({ images, has_more: endIndex < sortedFiles.length }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};