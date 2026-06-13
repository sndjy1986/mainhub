import https from 'https';

https.get('https://radioapi.sndjy.us/latest', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('HTTP', res.statusCode, data.slice(0, 1000)));
}).on('error', err => console.log('error:', err.message));
