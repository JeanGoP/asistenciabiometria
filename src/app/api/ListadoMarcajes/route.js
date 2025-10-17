'use server';

import { getPool } from '@/lib/db';

export async function POST(req) {
  try {
    const pool = await getPool();
    const spResult = await pool.request().execute('RRHH.St_ListTipoMarcajes');

    if (!spResult.recordset || spResult.recordset.length === 0) {
      return new Response(JSON.stringify({ ok: true, mensaje: '❌ No se encontró información en el SP', result: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, mensaje: '', result: spResult.recordset }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error en /api/getUsuario:', error);
    return new Response(JSON.stringify({ ok: false, mensaje: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
