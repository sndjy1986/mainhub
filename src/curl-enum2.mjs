import https from 'https';
https.get('https://scanner.sndjy.us/main.be3cde93dccb84d2.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let index = data.indexOf('.Pin=');
    if (index === -1) index = data.indexOf('Pin:');
    if (index !== -1) console.log(data.slice(index - 100, index + 200));
    else console.log('not found');
  });
}).on('error', err => console.log('error:', err.message));
