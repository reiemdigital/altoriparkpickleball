// client/src/socket.ts
import { io } from 'socket.io-client';

export const SOCKET_URL = 'http://192.168.8.110:5001';
export const socket = io(SOCKET_URL);