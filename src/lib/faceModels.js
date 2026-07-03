import * as faceapi from 'face-api.js';

// Promesas a nivel de módulo: los pesos se descargan y compilan UNA sola vez
// por sesión del navegador, sin importar reinicios de cámara o navegación.
let modelosPromise = null; // detector + landmarks + descriptor (+ warm-up completo)
let expresionesPromise = null; // red de expresiones: carga en segundo plano

// Rostro sintético dibujado con primitivas de canvas — NO es una fotografía de
// ninguna persona. Su único propósito es provocar la compilación de los
// shaders WebGL de la cadena completa (detector → landmarks → descriptor)
// antes del primer frame real de cámara. Ningún resultado se usa ni almacena.
function dibujarRostroSintetico() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 480;
  const ctx = c.getContext('2d');
  const cx = 320;
  const cy = 240;

  ctx.fillStyle = '#b8b8b8';
  ctx.fillRect(0, 0, 640, 480);

  // óvalo facial con gradiente
  const grad = ctx.createRadialGradient(cx, cy - 20, 40, cx, cy, 190);
  grad.addColorStop(0, '#e8c39e');
  grad.addColorStop(1, '#c69c7b');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 140, 185, 0, 0, Math.PI * 2);
  ctx.fill();

  // cabello
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 115, 148, 85, 0, Math.PI, 0);
  ctx.fill();

  // ojos y cejas
  for (const dx of [-55, 55]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy - 40, 27, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3220';
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 40, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 40, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx + dx - 30, cy - 70);
    ctx.quadraticCurveTo(cx + dx, cy - 84, cx + dx + 30, cy - 70);
    ctx.stroke();
  }

  // nariz
  ctx.strokeStyle = '#a97c55';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 25);
  ctx.lineTo(cx - 10, cy + 35);
  ctx.quadraticCurveTo(cx, cy + 45, cx + 12, cy + 35);
  ctx.stroke();

  // boca
  ctx.fillStyle = '#9c5a50';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 95, 45, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7c4038';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy + 95);
  ctx.quadraticCurveTo(cx, cy + 104, cx + 45, cy + 95);
  ctx.stroke();

  return c;
}

// Compila los shaders de TODAS las redes críticas. Medido: sin esto, la
// primera inferencia real cuesta 2.4–7.7 s; con esto, ~0.2 s.
async function warmupCompleto() {
  const stats = {};
  const cara = dibujarRostroSintetico();
  // scoreThreshold mínimo SOLO para el warm-up: cualquier "detección" del
  // rostro sintético basta para compilar la ruta de extracción/alineación.
  // El umbral real de producción (0.35) vive en page.js y no se modifica.
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.05 });

  // Redes llamadas directamente: garantiza compilar sus shaders aunque el
  // detector no reconozca el rostro sintético.
  let t = performance.now();
  await faceapi.nets.faceLandmark68Net.detectLandmarks(cara);
  stats['warmup landmarks (ms)'] = Math.round(performance.now() - t);

  t = performance.now();
  await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(cara);
  stats['warmup descriptor (ms)'] = Math.round(performance.now() - t);

  // Cadena completa: calienta también el detector y la ruta de extracción/
  // alineación del rostro que usan las tareas compuestas.
  t = performance.now();
  const det = await faceapi.detectSingleFace(cara, opts).withFaceLandmarks().withFaceDescriptor();
  stats['warmup cadena completa (ms)'] = Math.round(performance.now() - t);
  stats['rostro sintetico detectado'] = !!det;

  console.log('[biometria] warm-up de shaders: ' + JSON.stringify(stats));
  if (typeof window !== 'undefined') window.__warmupStats = stats;
}

export function cargarModelos() {
  if (!modelosPromise) {
    const t0 = performance.now();
    modelosPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ])
      .then(async () => {
        console.log(`[biometria] modelos base cargados en ${Math.round(performance.now() - t0)} ms`);
        try {
          await warmupCompleto();
        } catch {
          // El warm-up es solo una optimización; si falla no bloquea el flujo.
        }
        // La red de expresiones se descarga en segundo plano y solo se
        // EJECUTA cuando el reto activo es "Sonreír".
        cargarExpresiones().catch(() => {});
      })
      .catch((err) => {
        // Si la descarga falló (red), permitir reintentar en la próxima llamada.
        modelosPromise = null;
        throw err;
      });
  }
  return modelosPromise;
}

export function cargarExpresiones() {
  if (!expresionesPromise) {
    expresionesPromise = faceapi.nets.faceExpressionNet
      .loadFromUri('/models')
      .then(async () => {
        try {
          const c = document.createElement('canvas');
          c.width = 112;
          c.height = 112;
          c.getContext('2d').fillRect(0, 0, 112, 112);
          const t = performance.now();
          await faceapi.nets.faceExpressionNet.predictExpressions(c);
          console.log(`[biometria] warm-up expresiones: ${Math.round(performance.now() - t)} ms`);
        } catch {
          // solo optimización
        }
      })
      .catch((err) => {
        expresionesPromise = null;
        throw err;
      });
  }
  return expresionesPromise;
}
