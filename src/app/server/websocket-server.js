const WebSocket = require('ws')
const os = require('os')
const pty = require('node-pty')

const wss = new WebSocket.Server({ port: 6060 })

console.log('WebSocket server started on port 6060')

const allowedOrigins = ['http://localhost'];

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  console.log("origin" + origin)
  if (!allowedOrigins.includes(origin)) {
    console.log('Origin not allowed')
    ws.close(1008, 'Origin not allowed');
    return;
  }

  console.log('Client connected')
  
  // Spawn shell process
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env
  })
  
  // Send shell output to client
  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'output',
        data: data
      }))
    }
  })
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message)
      
      if (parsed.type === 'input') {
        ptyProcess.write(parsed.data)
      } else if (parsed.type === 'resize') {
        ptyProcess.resize(parsed.cols, parsed.rows)
      }
    } catch (e) {
      console.error('Error parsing message:', e)
    }
  })
  
  // Clean up when client disconnects
  ws.on('close', () => {
    console.log('Client disconnected')
    ptyProcess.kill()
  })
  
  // Handle shell process exit
  ptyProcess.onExit(() => {
    console.log('Shell process exited')
    ws.close()
  })
})
