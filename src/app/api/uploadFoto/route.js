export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type');
    const body = await req.arrayBuffer();

    const res = await fetch('https://www.sintesiserp.com/ApisS3Amazon/api/s3/upload?', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: body,
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en /api/uploadFoto:', error);
    return new Response(JSON.stringify({ ok: false, mensaje: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
