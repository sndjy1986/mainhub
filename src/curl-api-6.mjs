import https from 'https';

https.get('https://scanner.sndjy.us/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const scripts = data.match(/<script.*?src="(.*?)".*?><\/script>/g);
    console.log('scripts:', scripts);
  });
}).on('error', err => console.log('error:', err.message));
