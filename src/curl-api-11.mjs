import https from 'https';
https.get('https://scanner.sndjy.us/main.be3cde93dccb84d2.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let index = -1;
    for(let i=0; i<3; i++) {
       index = data.toLowerCase().indexOf('socket', index + 1);
       if (index > -1) {
         console.log('Match', i, ':', data.slice(Math.max(0, index-40), index+40));
       }
    }
  });
}).on('error', err => console.log('error:', err.message));
