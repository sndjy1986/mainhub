import https from 'https';
https.get('https://scanner.sndjy.us/main.be3cde93dccb84d2.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
     let apiMatches = data.match(/\/api\/[a-zA-Z0-9_-]+/g) || [];
     console.log('matches:', [...new Set(apiMatches)]);
  });
}).on('error', err => console.log('error:', err.message));
