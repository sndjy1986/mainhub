import https from 'https';

https.get('https://scanner.sndjy.us/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('headers:', res.headers, 'body preview:', data.slice(0, 500)));
}).on('error', err => console.log('error:', err.message));
