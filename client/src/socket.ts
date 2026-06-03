// client/src/socket.ts
import { io } from 'socket.io-client';

// Smart Environment Detection:
// In production (on Render), we use window.location.origin so the socket connects to the cloud automatically.
// In local development, it falls back seamlessly to your local network IP engine.
export const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin 
  : 'http://192.168.8.110:5001';

export const socket = io(SOCKET_URL, {
  withCredentials: true, // Crucial for cookie handshakes and session verification
  autoConnect: true      // Keeps the telemetry engine actively trying to maintain its stream link
});