'use server';

import { getPool } from '@/lib/db';
import sql from 'mssql';
import * as faceapi from 'face-api.js';

export async function POST(req) {
  try {
    const { id_usuario, descriptor, latitude, longitude, tipoMarcaje } = await req.json();
    if (!descriptor) throw new Error('Faltan datos');

    const pool = await getPool();

    const result = await pool.request().input('id_usuario', sql.BigInt, id_usuario).execute('RRHH.ST_ObtenerInfoUsuario');

    console.error(result);

    const registros = result.recordset.map((r) => ({
      id_usuario: r.id_usuario,
      descriptor: JSON.parse(r.descriptor),
    }));

    if (registros.length === 0) {
      return new Response(JSON.stringify({ ok: true, mensaje: 'No hay usuarios registrados', registrado: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let usuarioCoincidente = null;
    for (const usuario of registros) {
      const distancia = faceapi.euclideanDistance(descriptor, usuario.descriptor);
      if (distancia <= 0.5) {
        usuarioCoincidente = usuario;
        break;
      }
    }

    if (!usuarioCoincidente) {
      return new Response(
        JSON.stringify({
          ok: true,
          registrado: 1,
          coincide: 0,
          mensaje: 'No logramos reconocerte, Intentalo de nuevo.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const spResult = await pool
      .request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('resultado', sql.Bit, 1)
      .input('tipoMarcaje', sql.VarChar(100), String(tipoMarcaje || ''))
      .input('lat', sql.VarChar(100), String(latitude || ''))
      .input('lon', sql.VarChar(100), String(longitude || ''))
      .execute('RRHH.ST_ValidacionAsistencia');

    return new Response(
      JSON.stringify({
        ok: true,
        mensaje: `✅ Persona validada y guardada en la base de datos`,
        coincide: 1,
        registrado: 1,
        result: spResult,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en /api/validar:', error);
    return new Response(JSON.stringify({ ok: false, mensaje: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
