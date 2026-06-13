import WebSocket from 'ws';
const ws = new WebSocket('wss://scanner.sndjy.us/');
ws.on('open', () => {
  console.log('WS OPEN!');
  ws.send(JSON.stringify(["VER"]));
  ws.send(JSON.stringify(["CFG"]));
  ws.send(JSON.stringify(["LFM", null])); // live feed map?
});
ws.on('message', (d) => console.log('msg:', d.toString()));
setTimeout(() => ws.close(), 5000);
