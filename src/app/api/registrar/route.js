'use server';

import { getPool } from '@/lib/db';

import sql from 'mssql';

export async function POST(req) {
  try {
    const { descriptor, latitude, longitude, id_usuario } = await req.json();
    if (!descriptor) {
      return new Response(JSON.stringify({ ok: false, mensaje: 'Faltan datos' }), { status: 400 });
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('Descriptor', sql.NVarChar(sql.MAX), JSON.stringify(descriptor))
      .input('lat_enrolado', sql.VarChar(100), String(latitude))
      .input('lon_enrolado', sql.VarChar(100), String(longitude))
      .execute('RRHH.ST_RegistroBiometrico');
    return new Response(JSON.stringify({ ok: true, mensaje: '✅ Usuario registrado', result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en /api/registrar:', error);
    return new Response(JSON.stringify({ ok: false, mensaje: 'Error al registrar usuario' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// import fs from 'fs';
// import path from 'path';

// const filePath = path.join(process.cwd(), 'data', 'usuarios.json');

// // Crear archivo si no existe
// if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));

// export async function POST(req) {
//   try {
//     const { nombre, descriptor } = await req.json();
//     if (!nombre || !descriptor) throw new Error('Faltan datos');

//     let registros = [];
//     try {
//       const rawData = fs.readFileSync(filePath, 'utf-8');
//       registros = rawData ? JSON.parse(rawData) : [];
//     } catch {
//       registros = [];
//     }

//     // Verificar si ya existe
//     if (registros.find((u) => u.nombre === nombre)) {
//       return new Response(JSON.stringify({ ok: false, mensaje: 'Usuario ya registrado' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
//     }

//     // Guardar nuevo usuario
//     registros.push({ nombre, descriptor });
//     fs.writeFileSync(filePath, JSON.stringify(registros, null, 2));

//     return new Response(JSON.stringify({ ok: true, mensaje: '✅ Usuario registrado correctamente' }), {
//       status: 200,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   } catch (error) {
//     console.error('Error en /api/registrar:', error);
//     return new Response(JSON.stringify({ ok: false, mensaje: 'Error al registrar usuario' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
//   }
// }
