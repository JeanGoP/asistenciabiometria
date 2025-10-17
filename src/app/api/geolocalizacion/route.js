import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'geolocalizacion.json');

// Crear el archivo si no existe
if (!fs.existsSync(filePath)) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ lat: 0, lon: 0, radio: 0 }, null, 2));
}

export async function GET() {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return new Response(data, { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'No se pudo leer la geolocalización' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const newGeo = await req.json();
    fs.writeFileSync(filePath, JSON.stringify(newGeo, null, 2));
    return new Response(JSON.stringify({ mensaje: 'Geolocalización actualizada' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'No se pudo guardar la geolocalización' }), { status: 500 });
  }
}
