import https from 'https';
https.get('https://scanner.sndjy.us/main.be3cde93dccb84d2.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let match = data.match(/var [a-zA-Z0-9_]+\s*=\s*\(\s*([a-zA-Z0-9_]+)\s*=>\s*\{\s*\1\s*\[\s*\1\.Pin\s*=\s*[0-9]+\]/i);
    if (!match) match = data.match(/Pin\s*=\s*[0-9]+/g);
    console.log(match);
  });
}).on('error', err => console.log('error:', err.message));
