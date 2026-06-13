import https from 'https';
const get = (url) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(url, 'statusCode:', res.statusCode, 'content-type:', res.headers['content-type'], data.slice(0, 100)));
  }).on('error', err => console.log('error:', err.message));
}
get('https://scanner.sndjy.us/socket.io/?EIO=4&transport=polling');
get('https://scanner.sndjy.us/api/live');
get('https://scanner.sndjy.us/manifest.webmanifest');
