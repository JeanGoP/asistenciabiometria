'use server';

import { getPool } from '@/lib/db';

// Catálogo casi estático: se cachea en memoria del servidor 5 minutos para
// que el primer render de la página no pague un round-trip a SQL Server.
let cache = null; // { data, ts }
const TTL_MS = 5 * 60 * 1000;

async function obtenerTipos() {
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return new Response(JSON.stringify({ ok: true, mensaje: '', result: cache.data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pool = await getPool();
  const spResult = await pool.request().execute('RRHH.St_ListTipoMarcajes');

  if (!spResult.recordset || spResult.recordset.length === 0) {
    return new Response(JSON.stringify({ ok: true, mensaje: '❌ No se encontró información en el SP', result: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  cache = { data: spResult.recordset, ts: Date.now() };

  return new Response(JSON.stringify({ ok: true, mensaje: '', result: spResult.recordset }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  try {
    return await obtenerTipos();
  } catch (error) {
    console.error('❌ Error en /api/ListadoMarcajes:', error);
    return new Response(JSON.stringify({ ok: false, mensaje: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Se mantiene POST por compatibilidad con clientes antiguos.
export async function POST() {
  return GET();
}
