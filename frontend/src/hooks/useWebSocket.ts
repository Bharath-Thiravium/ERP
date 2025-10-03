import { useEffect, useRef, useState } from 'react'
import { getWebSocketUrl } from '../lib/api'

interface UseWebSocketOptions {
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const connect = () => {
    if (!mountedRef.current || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    try {
      const wsUrl = getWebSocketUrl(url)
      console.log('WebSocket URL construction:', { input: url, output: wsUrl })
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        if (!mountedRef.current) return
        setIsConnected(true)
        setReconnectAttempts(0)
        onOpen?.()
      }

      wsRef.current.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onerror = (error) => {
        if (!mountedRef.current) return
        onError?.(error)
      }

      wsRef.current.onclose = (event) => {
        if (!mountedRef.current) return
        setIsConnected(false)
        onClose?.()

        // Only reconnect if component is still mounted and not a normal close
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setReconnectAttempts(prev => prev + 1)
              connect()
            }
          }, reconnectInterval)
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
    }
  }

  const disconnect = () => {
    mountedRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000, 'Component unmounting')
    }
  }

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  useEffect(() => {
    mountedRef.current = true
    
    // Small delay to avoid React Strict Mode double mounting issues
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        connect()
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      disconnect()
    }
  }, [url])

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnectAttempts
  }
}