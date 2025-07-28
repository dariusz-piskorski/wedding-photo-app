document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const statusDiv = document.getElementById('status');

    uploadButton.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            statusDiv.textContent = 'Najpierw wybierz plik!';
            return;
        }

        statusDiv.textContent = 'Inicjowanie wysyłania...';

        try {
            // Krok 1: Wywołaj funkcję Netlify, aby uzyskać tymczasowy link do wysyłki na Dropbox
            const netlifyFunctionUrl = '/.netlify/functions/get-dropbox-upload-link'; // To będzie nasz endpoint Netlify Function
            const response = await fetch(netlifyFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: file.name }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Błąd funkcji Netlify: ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            const uploadUrl = data.uploadUrl;

            if (!uploadUrl) {
                throw new Error('Nie otrzymano linku do wysłania z funkcji Netlify.');
            }

            statusDiv.textContent = 'Wysyłanie pliku do Dropbox...';

            // Krok 2: Wyślij plik bezpośrednio do Dropbox
            const dropboxResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                body: file,
            });

            if (dropboxResponse.ok) {
                statusDiv.textContent = 'Plik został pomyślnie wysłany!';
            } else {
                const errorText = await dropboxResponse.text();
                throw new Error(`Błąd wysyłania do Dropbox: ${errorText}`);
            }

        } catch (error) {
            statusDiv.textContent = `Wystąpił błąd: ${error.message}`;
            console.error(error);
        }
    });
});
