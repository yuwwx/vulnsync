type RequestWithIp = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { localAddress?: string };
};

// IPv4 через dual-stack сокет приходит как IPv4-mapped IPv6.
export function normalizeIp(ip?: string): string | undefined {
  if (!ip) {
    return undefined;
  }

  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
}

// Source IP: реальный клиент (за nginx — X-Real-IP).
export function getSourceIp(req: RequestWithIp): string | undefined {
  const realIp = req.headers?.['x-real-ip'];

  return normalizeIp(typeof realIp === 'string' ? realIp : req.ip);
}

// Destination IP: IP хоста/узла из APP_HOST_IP, иначе локальный адрес сокета.
// В Docker/за прокси socket.localAddress — внутренний адрес контейнера.
export function getDestinationIp(req: RequestWithIp): string | undefined {
  const configured = process.env.APP_HOST_IP?.trim();

  return configured || normalizeIp(req.socket?.localAddress);
}
