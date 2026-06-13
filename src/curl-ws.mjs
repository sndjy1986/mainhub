import WebSocket from 'ws';

const ws = new WebSocket('wss://scanner.sndjy.us/');

ws.on('open', () => {
  console.log('connected');
});

ws.on('message', (data) => {
  console.log('message:', data.toString());
});

ws.on('error', (e) => console.log('error', e));

setTimeout(() => ws.close(), 5000);
