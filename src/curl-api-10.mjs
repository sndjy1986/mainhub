import https from 'https';
https.get('https://scanner.sndjy.us/main.be3cde93dccb84d2.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
     let apiMatches = data.match(/api/gi) || [];
     console.log('matches length:', apiMatches.length);
     const socket = data.match(/socket/gi) || [];
     console.log('socket matches:', socket.length);
  });
}).on('error', err => console.log('error:', err.message));
