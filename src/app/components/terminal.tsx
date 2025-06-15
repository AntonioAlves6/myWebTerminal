'use client'
import { useEffect, useRef, useState } from 'react'

export function MyTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminal = useRef<any>(null)
  const fitAddon = useRef<any>(null)
  const socket = useRef<WebSocket | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const initTerminal = async () => {
      if (terminalRef.current && !terminal.current) {
        try {
          // Dynamic imports to avoid SSR issues
          const { Terminal } = await import('@xterm/xterm')
          const { FitAddon } = await import('@xterm/addon-fit')
          
          // Import CSS dynamically
          await import('@xterm/xterm/css/xterm.css')
          
          console.log('Creating terminal instance')
          terminal.current = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            rows: 24,
            cols: 80,
          })
          
          // Add fit addon
          fitAddon.current = new FitAddon()
          terminal.current.loadAddon(fitAddon.current)
          
          console.log('Opening terminal')
          terminal.current.open(terminalRef.current)
          fitAddon.current.fit()
          
          // Initialize WebSocket connection
          initWebSocket()
          
          setIsLoaded(true)
          console.log('Terminal opened successfully')
          
          // Handle terminal input - send to WebSocket
          terminal.current.onData((data: string) => {
            if (socket.current && socket.current.readyState === WebSocket.OPEN) {
              socket.current.send(JSON.stringify({
                type: 'input',
                data: data
              }))
            }
          })
          
          // Handle terminal resize
          terminal.current.onResize((size: any) => {
            if (socket.current && socket.current.readyState === WebSocket.OPEN) {
              socket.current.send(JSON.stringify({
                type: 'resize',
                cols: size.cols,
                rows: size.rows
              }))
            }
          })
          
        } catch (error) {
          console.error('Error creating terminal:', error)
        }
      }
    }

    const initWebSocket = () => {
      console.log('Creating WebSocket connection')
      socket.current = new WebSocket("ws://localhost:6060")
      
      socket.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        if (terminal.current) {
          terminal.current.write('\r\nConnected to server\r\n')
        }
      }
      
      socket.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'output' && terminal.current) {
            terminal.current.write(message.data)
          }
        } catch (e) {
          // If it's not JSON, treat as raw data
          if (terminal.current) {
            terminal.current.write(event.data)
          }
        }
      }
      
      socket.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        if (terminal.current) {
          terminal.current.write('\r\nDisconnected from server\r\n')
        }
      }
      
      socket.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (terminal.current) {
          terminal.current.write('\r\nConnection error\r\n')
        }
      }
    }

    initTerminal()

    return () => {
      if (socket.current) {
        socket.current.close()
      }
      if (terminal.current) {
        console.log('Disposing terminal')
        terminal.current.dispose()
      }
    }
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <span>Terminal Status: {isLoaded ? 'Loaded' : 'Loading...'}</span>
        <span style={{ marginLeft: '20px' }}>
          Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>
      <div 
        ref={terminalRef} 
        style={{ 
          width: '100%', 
          height: '400px', 
          border: '1px solid #ccc',
          backgroundColor: '#000'
        }} 
      />
    </div>
  )
}