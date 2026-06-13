import WebSocket from 'ws';
const ws = new WebSocket('wss://scanner.sndjy.us/');
ws.on('open', () => {
  console.log('WS OPEN!');
  ws.send(JSON.stringify({ type: 'VER' }));
  ws.send(JSON.stringify({ type: 'CFG' }));
});
ws.on('message', (d) => console.log('msg:', d.toString()));
setTimeout(() => ws.close(), 5000);
