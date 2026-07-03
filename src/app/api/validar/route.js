'use server';

import { getPool } from '@/lib/db';
import sql from 'mssql';

// Distancia euclidiana entre dos descriptores de 128 floats. Reemplaza el
// import de face-api.js completo (que arrastra tfjs y disparaba el cold start
// del servidor) por la única operación que realmente se necesitaba.
const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};

export async function POST(req) {
  try {
    const { id_usuario, descriptor, latitude, longitude, tipoMarcaje, enSede, rangodif, ubicacionMarcada } = await req.json();
    if (!descriptor) throw new Error('Faltan datos');

    const pool = await getPool();

    const result = await pool.request().input('id_usuario', sql.BigInt, id_usuario).execute('RRHH.ST_ObtenerInfoUsuario');

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
      const distancia = euclideanDistance(descriptor, usuario.descriptor);
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

    await pool
      .request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('resultado', sql.Bit, 1)
      .input('tipoMarcaje', sql.VarChar(1000), String(tipoMarcaje || ''))
      .input('lat', sql.VarChar(1000), String(latitude || ''))
      .input('lon', sql.VarChar(1000), String(longitude || ''))
      .input('enSede', sql.VarChar(1000), String(enSede || ''))
      .input('rangodif', sql.VarChar(1000), String(rangodif || ''))
      .input('direccionActual', sql.VarChar(1000), String(ubicacionMarcada || ''))
      .execute('RRHH.ST_ValidacionAsistencia');

    // No devolver el objeto mssql completo (recordsets, metadata, rowsAffected):
    // el cliente solo lee ok/coincide/mensaje.
    return new Response(
      JSON.stringify({
        ok: true,
        mensaje: `✅ Persona validada y guardada en la base de datos`,
        coincide: 1,
        registrado: 1,
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
