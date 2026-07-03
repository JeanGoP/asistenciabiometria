import sql from 'mssql';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST, // ej: "localhost" o "192.168.1.10"
  database: process.env.DB_NAME,
  pool: {
    // min > 0 mantiene conexiones vivas: el primer marcaje tras un periodo de
    // inactividad no paga el handshake TCP+TLS+login completo.
    min: 2,
    max: 10,
    idleTimeoutMillis: 300000,
  },
  options: {
    encrypt: false, // true si usas Azure
    trustServerCertificate: true, // necesario en local/dev
  },
};

// Se cachea la PROMESA (no el pool resuelto): dos requests simultáneos al
// arrancar ya no crean dos pools en paralelo.
let poolPromise;

export function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config).catch((err) => {
      // Si la conexión inicial falla, no dejar la promesa rechazada cacheada:
      // el siguiente request debe poder reintentar.
      poolPromise = undefined;
      throw err;
    });
  }
  return poolPromise;
}
