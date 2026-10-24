import { createSocket } from 'node:dgram';

/** Private-network origins (10/8, 172.16/12, 192.168/16): a phone on the same Wi-Fi as the dev laptop. */
export const PRIVATE_NETWORK_ORIGIN = /^http:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

/**
 * The laptop's address on the local network, or null when offline.
 * Asks the OS which interface routes to the internet, so VirtualBox/WSL/Docker adapters are skipped.
 * A UDP "connect" sends no packets.
 */
export function lanAddress(): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = createSocket('udp4');
    socket.once('error', () => {
      socket.close();
      resolve(null);
    });
    socket.connect(53, '8.8.8.8', () => {
      const { address } = socket.address();
      socket.close();
      resolve(address);
    });
  });
}

/** Swaps a localhost URL's host for the LAN address so phones can open it; other URLs pass through. */
export async function phoneReachableUrl(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return url;
  const ip = await lanAddress();
  if (!ip) return url;
  parsed.hostname = ip;
  return parsed.toString().replace(/\/$/, '');
}
