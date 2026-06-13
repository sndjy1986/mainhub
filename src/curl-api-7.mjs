import https from 'https';
https.get('https://scanner.sndjy.us/assets/config.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('assets/config.json:', res.statusCode, data));
});
