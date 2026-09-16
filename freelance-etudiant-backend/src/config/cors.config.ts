/** Origines explicites communes a l'API HTTP et aux deux gateways Socket.IO. */
export function getCorsOrigins(): string[] {
  return (
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:3001'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

