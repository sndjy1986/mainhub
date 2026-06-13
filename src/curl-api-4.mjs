import https from 'https';

const get = (path) => {
  https.get('https://scanner.sndjy.us' + path, (res) => {
    console.log(path, res.statusCode, res.headers['content-type']);
  });
}

get('/stream');
get('/live');
get('/status.json');
get('/status-json.xsl');
get('/api/config');
get('/api/live');
get('/Icecast2');
