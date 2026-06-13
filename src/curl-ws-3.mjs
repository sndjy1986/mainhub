import WebSocket from 'ws';
const ws = new WebSocket('wss://scanner.sndjy.us/');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'PIN', data: '' }));
});
ws.on('message', (d) => console.log('msg:', d.toString()));
setTimeout(() => ws.close(), 10000);
