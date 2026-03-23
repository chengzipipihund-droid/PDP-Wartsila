/**
 * SmartNav Controller Server
 * 
 * Receives IR lever data from Python (via stdin pipe or child process)
 * and broadcasts to React frontend via WebSocket.
 * 
 * Usage:
 *   # Option A: pipe from Python
 *   python3 ir_reader.py --serial /dev/ttyUSB0 | node server.js
 * 
 *   # Option B: server spawns Python
 *   node server.js --spawn "python3 ir_reader.py --serial /dev/ttyUSB0"
 * 
 *   # Option C: test with file replay
 *   cat ../Dataset.txt | python3 ir_reader.py --stdin --rate 0.1 | node server.js
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 3001;
const wss = new WebSocket.Server({ port: PORT });

console.log(`[Server] WebSocket listening on ws://0.0.0.0:${PORT}`);
console.log(`[Server] React app should connect to ws://<this-ip>:${PORT}`);

let clientCount = 0;

wss.on('connection', (ws) => {
  clientCount++;
  console.log(`[Server] Client connected (${clientCount} total)`);
  
  ws.on('close', () => {
    clientCount--;
    console.log(`[Server] Client disconnected (${clientCount} remaining)`);
  });
});

function broadcast(data) {
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Check if we should spawn Python or read from stdin
const args = process.argv.slice(2);
const spawnIdx = args.indexOf('--spawn');

if (spawnIdx !== -1 && args[spawnIdx + 1]) {
  // Option B: spawn Python child process
  const cmd = args[spawnIdx + 1].split(' ');
  const py = spawn(cmd[0], cmd.slice(1));
  
  console.log(`[Server] Spawned: ${args[spawnIdx + 1]}`);
  
  py.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => broadcast(line));
  });
  
  py.stderr.on('data', (d) => {
    console.log(`[Python] ${d.toString().trim()}`);
  });
  
  py.on('close', (code) => {
    console.log(`[Server] Python exited with code ${code}`);
  });

} else {
  // Option A/C: read from stdin (piped)
  console.log('[Server] Reading from stdin (pipe mode)');
  
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (data) => {
    const lines = data.split('\n').filter(l => l.trim());
    lines.forEach(line => broadcast(line));
  });
}

// Heartbeat to keep connections alive
setInterval(() => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 30000);
