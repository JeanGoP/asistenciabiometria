'use server';

import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function POST(req) {
  try {
    const { id_usuario, fotoUrl, latitude, longitude, tipoMarcaje, enSede, rangodif, ubicacionMarcada } = await req.json();

    const pool = await getPool();

    await pool
      .request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('resultado', sql.Bit, 0)
      .input('tipoMarcaje', sql.VarChar(1000), String(tipoMarcaje || ''))
      .input('lat', sql.VarChar(1000), String(latitude || ''))
      .input('lon', sql.VarChar(1000), String(longitude || ''))
      .input('enSede', sql.VarChar(1000), String(enSede || ''))
      .input('rangodif', sql.VarChar(1000), String(rangodif || ''))
      .input('direccionActual', sql.VarChar(1000), String(ubicacionMarcada || ''))
      .input('Foto', sql.VarChar(1000), String(fotoUrl || ''))
      .execute('RRHH.ST_ValidacionAsistencia');

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en /api/guardarIntento:', error);
    return new Response(JSON.stringify({ ok: false, mensaje: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
