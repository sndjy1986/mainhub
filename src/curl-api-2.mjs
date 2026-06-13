import https from 'https';
const get = (url) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(url, ':', res.headers['content-type'], data.slice(0, 100)));
  }).on('error', err => console.log('error:', err.message));
}
get('https://scanner.sndjy.us/status-json.xsl');
get('https://scanner.sndjy.us/api/systems');
get('https://scanner.sndjy.us/config.json');
