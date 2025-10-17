// import fs from 'fs';
// import path from 'path';

// const filePath = path.join(process.cwd(), 'data', 'asistencia.json');

// export async function POST(req) {
//   try {
//     const { nombre, descriptor } = await req.json();
//     const fecha = new Date().toISOString();

//     console.log('Datos recibidos:', { nombre, descriptorLength: descriptor.length });

//     // Leer archivo de forma segura
//     let registros = [];
//     try {
//       const rawData = fs.readFileSync(filePath, 'utf-8');
//       registros = rawData ? JSON.parse(rawData) : [];
//     } catch (err) {
//       console.warn('Archivo JSON vacío o corrupto, inicializando con []');
//       registros = [];
//     }

//     registros.push({ nombre, fecha, descriptor });

//     fs.writeFileSync(filePath, JSON.stringify(registros, null, 2));

//     return new Response(JSON.stringify({ ok: true, mensaje: '✅ Asistencia registrada' }), {
//       status: 200,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   } catch (error) {
//     console.error('Error en POST /api/asistencia:', error);
//     return new Response(JSON.stringify({ ok: false, mensaje: 'Error en el servidor' }), {
//       status: 500,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   }
// }
