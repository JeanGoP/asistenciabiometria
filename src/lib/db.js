import sql from 'mssql';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST, // ej: "localhost" o "192.168.1.10"
  database: process.env.DB_NAME,
  options: {
    encrypt: false, // true si usas Azure
    trustServerCertificate: true, // necesario en local/dev
  },
};

let pool;

export async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}
