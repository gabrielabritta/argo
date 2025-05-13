const SERVER_IP = import.meta.env.VITE_SERVER_IP || '192.168.0.149'
export const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${SERVER_IP}:8000/api`
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || `ws://${SERVER_IP}:8000/ws`
