'use server';

import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function POST(req) {
  try {
    const { id_usuario, tipoMarcaje } = await req.json();

    if (!id_usuario || !tipoMarcaje) {
      return new Response(JSON.stringify({ ok: false, mensaje: '❌ Faltan parámetros (id_usuario o tipoMarcaje)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pool = await getPool();

    const spResult = await pool
      .request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('tipoMarcaje', sql.VarChar(20), tipoMarcaje)
      .execute('RRHH.GetMarcaje');

    if (!spResult.recordset || spResult.recordset.length === 0) {
      return new Response(JSON.stringify({ ok: true, mensaje: '❌ No se encontró información en el SP', result: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, mensaje: '', result: spResult.recordset[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error en /api/getUsuario:', error);
    return new Response(JSON.stringify({ ok: false, mensaje: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
