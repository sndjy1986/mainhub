import https from 'https';
https.get('https://scanner.sndjy.us/main.be3cde93dccb84d2.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let index = data.indexOf('authenticate(');
    if (index !== -1) console.log(data.slice(index - 150, index + 300));
  });
}).on('error', err => console.log('error:', err.message));
