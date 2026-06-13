import https from 'https';

const getJSON = (path) => {
  https.get(`https://scanner.sndjy.us${path}`, { headers: { 'Accept': 'application/json' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(path, res.statusCode, res.headers['content-type'], data.slice(0, 300)));
  }).on('error', err => console.log('error:', err.message));
}

getJSON('/api/config');
getJSON('/api/systems');
getJSON('/api/calls');
