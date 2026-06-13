import WebSocket from 'ws';
const ws = new WebSocket('wss://scanner.sndjy.us/');
ws.on('open', () => {
  ws.send(JSON.stringify(["VER"]));
  ws.send(JSON.stringify(["CFG"]));
  ws.send(JSON.stringify(["PIN", Buffer.from("").toString('base64')]));
});
ws.on('message', (d) => {
  const json = JSON.parse(d.toString());
  if (json[0] !== 'CFG') {
    console.log('msg:', json);
  } else {
    console.log('msg: CFG'); // CFG is too long
  }
});
setTimeout(() => ws.close(), 10000);
