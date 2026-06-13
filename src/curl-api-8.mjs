import https from 'https';

https.get('https://scanner.sndjy.us/main.be3cde93dccb84d2.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
     // try to find /api or socket endpoints
     const urls = data.match(/"\/api[^"]*"/g) || [];
     console.log('urls:', [...new Set(urls)]);
  });
}).on('error', err => console.log('error:', err.message));
