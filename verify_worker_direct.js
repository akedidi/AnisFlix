import axios from 'axios';

async function checkWorker() {
    const url = 'https://anisflix.kedidi-anis.workers.dev/';
    const params = {
        path: 'afterdark',
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
        year: 1999,
        originalTitle: 'Fight Club'
    };

    console.log(`Checking Worker: ${url}`);

    try {
        const response = await axios.get(url, { params });
        console.log(`Status: ${response.status}`);
        console.log('Data Preview:', JSON.stringify(response.data).substring(0, 200));
    } catch (error) {
        if (error.response) {
            console.log(`Error Status: ${error.response.status}`);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

checkWorker();
