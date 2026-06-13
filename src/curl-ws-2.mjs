import WebSocket from 'ws';
const ws = new WebSocket('wss://scanner.sndjy.us/');
ws.on('open', () => {
  console.log('connected');
  ws.send('1'); // try ping or auth?
  ws.send(JSON.stringify({"type":"auth", "pin": btoa("")}));
  ws.send(JSON.stringify({action: "authenticate", pin: ""}));
});
ws.on('message', (d) => console.log('msg:', d.toString()));
setTimeout(() => ws.close(), 10000);
