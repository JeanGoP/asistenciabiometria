'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as faceapi from 'face-api.js';
import { cargarModelos } from '@/lib/faceModels';
import { useAppContext } from '@/context/AppContext';
import { Lightbulb, Glasses, Crosshair, Contrast, Smartphone, CheckCircle2, Smile, ArrowLeftRight, TriangleAlert, User } from 'lucide-react';

export default function RegistrarUsuario() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isDetectingRef = useRef(false);
  const contadorActivoRef = useRef(false);
  const { usuario } = useAppContext();
  const router = useRouter();

  const [modelosCargados, setModelosCargados] = useState(false);
  const [rostroPresente, setRostroPresente] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [contador, setContador] = useState(0);
  const [registrado, setRegistrado] = useState(false);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [distanciaOk, setDistanciaOk] = useState(false);

  const id_usuario = usuario;

  // ── Dibujo canvas ──────────────────────────────────────────────────────────

  const dibujarGuiaRostro = (ctx, cw, ch) => {
    const cx = cw / 2;
    const cy = ch * 0.45;
    const rx = cw * 0.22;
    const ry = ch * 0.32;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.clearRect(0, 0, cw, ch);
    ctx.restore();

    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -(Date.now() / 60) % 20;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `bold ${Math.round(cw * 0.038)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText('Ubica tu rostro aquí', cx, cy + ry + ch * 0.07);
    ctx.restore();
  };

  const dibujarFeedbackDistancia = (ctx, box, cw, ch) => {
    const ratio = box.width / cw;
    if (ratio >= 0.2 && ratio <= 0.6) return;

    const demasiado = ratio > 0.6;
    const texto = demasiado ? 'Aléjate un poco' : 'Acércate a la cámara';
    const flecha = demasiado ? '▼' : '▲';
    const color = demasiado ? '#ff5722' : '#ff9800';

    const fontSize = Math.round(cw * 0.048);
    const py = box.y > ch * 0.5 ? box.y - 18 : box.y + box.height + fontSize + 10;
    const label = `${flecha}  ${texto}  ${flecha}`;

    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    const pw = ctx.measureText(label).width + 24;
    const ph = fontSize + 14;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(cw / 2 - pw / 2, py - ph + 4, pw, ph, 8);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(label, cw / 2, py);
    ctx.restore();
  };

  const dibujarRecuadroRostro = (ctx, box, estado) => {
    const { x, y, width, height } = box;
    const cornerLen = Math.min(width, height) * 0.22;
    const color =
      estado === 'registrando' ? '#00e676' :
      estado === 'listo'       ? '#ffeb3b' :
      '#00e5ff';

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    [
      [[x, y + cornerLen], [x, y], [x + cornerLen, y]],
      [[x + width - cornerLen, y], [x + width, y], [x + width, y + cornerLen]],
      [[x, y + height - cornerLen], [x, y + height], [x + cornerLen, y + height]],
      [[x + width - cornerLen, y + height], [x + width, y + height], [x + width, y + height - cornerLen]],
    ].forEach(([s, c, e]) => {
      ctx.beginPath();
      ctx.moveTo(...s);
      ctx.lineTo(...c);
      ctx.lineTo(...e);
      ctx.stroke();
    });

    ctx.shadowBlur = 0;
  };

  // ── Cámara y modelos ────────────────────────────────────────────────────────

  async function startCamera() {
    // Cargador compartido: si el usuario viene de la página principal los
    // modelos ya están en memoria y esto resuelve al instante.
    const [stream] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      }),
      cargarModelos(),
    ]);
    if (videoRef.current) videoRef.current.srcObject = stream;
    setModelosCargados(true);
  }

  const obtenerDeteccionRapida = async () => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 });
    return await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks() || null;
  };

  const obtenerDescriptorFinal = async () => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 });
    return await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor() || null;
  };

  // ── Geolocalización ─────────────────────────────────────────────────────────

  const obtenerUbicacion = () =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
        reject,
        { enableHighAccuracy: true }
      )
    );

  // ── Inicio automático (3 s en vez de 10 s) ──────────────────────────────────

  useEffect(() => {
    // Precarga durante los 3 s de la pantalla de instrucciones.
    cargarModelos().catch(() => {});
    const timer = setTimeout(() => {
      setMostrarCamara(true);
      startCamera();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // ── Registro ────────────────────────────────────────────────────────────────

  const registrarPersona = async () => {
    if (registrando) return;
    setRegistrando(true);
    setMensaje('Capturando rostro...');

    const deteccion = await obtenerDescriptorFinal();
    if (!deteccion) {
      setMensaje('No se detectó el rostro. Intenta de nuevo.');
      setRegistrando(false);
      contadorActivoRef.current = false;
      setContador(0);
      return;
    }

    const descriptor = Array.from(deteccion.descriptor);
    let ubicacionActual;
    try {
      setMensaje('📡 Obteniendo ubicación...');
      ubicacionActual = await obtenerUbicacion();
    } catch {
      ubicacionActual = { lat: null, lon: null };
    }

    const res = await fetch('/api/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario, latitude: ubicacionActual.lat, longitude: ubicacionActual.lon, descriptor }),
    });
    const data = await res.json();
    setMensaje(data.mensaje);
    setRegistrado(true);
  };

  // ── Loop de detección ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!modelosCargados || registrado) return;

    const intervalo = setInterval(async () => {
      if (isDetectingRef.current) return;
      isDetectingRef.current = true;

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.videoWidth === 0 || !canvas) return;

        const deteccion = await obtenerDeteccionRapida();
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        if (!deteccion) {
          setRostroPresente(false);
          setDistanciaOk(false);
          contadorActivoRef.current = false;
          setContador(0);
          dibujarGuiaRostro(ctx, canvas.width, canvas.height);
          return;
        }

        setRostroPresente(true);
        const resized = faceapi.resizeResults(deteccion, displaySize);
        const box = resized.detection.box;

        const ratio = box.width / canvas.width;
        const ok = ratio >= 0.2 && ratio <= 0.6;
        setDistanciaOk(ok);

        const estado = contadorActivoRef.current ? 'listo' : 'presente';
        dibujarRecuadroRostro(ctx, box, estado);
        dibujarFeedbackDistancia(ctx, box, canvas.width, canvas.height);

        if (ok && !contadorActivoRef.current && !registrando) {
          contadorActivoRef.current = true;
          setContador(5);
          let c = 5;
          const t = setInterval(() => {
            c -= 1;
            setContador(c);
            if (c <= 0) {
              clearInterval(t);
              setContador(0);
              registrarPersona();
            }
          }, 1000);
        }

        if (!ok && contadorActivoRef.current) {
          contadorActivoRef.current = false;
          setContador(0);
          setMensaje('Ajusta tu posición para continuar');
        }
      } finally {
        isDetectingRef.current = false;
      }
    }, 300);

    return () => clearInterval(intervalo);
  }, [modelosCargados, registrado, registrando]);

  // ── Redirigir tras registro exitoso ─────────────────────────────────────────

  useEffect(() => {
    if (!registrado) return;
    const t = setTimeout(() => router.push('/'), 4000);
    return () => clearTimeout(t);
  }, [registrado]);

  // ── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>

      {/* Encabezado */}
      <div style={{ width: '100%', maxWidth: 480, marginBottom: 20 }}>
        <h2 style={{ color: '#0f7cc0', margin: 0, fontSize: 22 }}>Registro Biométrico</h2>
        <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>
          Cédula: <strong style={{ color: '#111827' }}>{id_usuario}</strong>
        </p>
      </div>

      {registrado ? (
        /* ── Estado: registrado ── */
        <div style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
          borderRadius: 16, padding: '40px 24px', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <CheckCircle2 size={56} color="#059669" style={{ marginBottom: 8 }} />
          <h2 style={{ color: '#065f46', margin: '12px 0 8px' }}>¡Registro exitoso!</h2>
          <p style={{ color: '#047857', margin: 0 }}>Redirigiendo al inicio en unos segundos...</p>
        </div>
      ) : !mostrarCamara ? (
        /* ── Estado: instrucciones ── */
        <div style={{
          width: '100%', maxWidth: 480,
          background: '#fff', borderRadius: 16, padding: '28px 24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          <h3 style={{ color: '#374151', margin: '0 0 16px' }}>Antes de continuar, ten en cuenta:</h3>
          <ul style={{ padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, margin: 0 }}>
            {[
              [<Lightbulb size={20} color="#d97706" />, 'Busca un lugar bien iluminado'],
              [<Glasses size={20} color="#6b7280" />, 'Retira gafas o mascarilla si usas'],
              [<Crosshair size={20} color="#0f7cc0" />, 'Mantén tu rostro centrado en la cámara'],
              [<Contrast size={20} color="#7c3aed" />, 'Evita fondos muy oscuros o brillantes'],
              [<Smartphone size={20} color="#059669" />, 'Mantente quieto durante el registro'],
            ].map(([icon, text]) => (
              <li key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#4b5563', fontSize: 14 }}>
                {icon} {text}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 20, background: '#eff6ff', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="#1d4ed8" />
            <p style={{ color: '#1d4ed8', margin: 0, fontSize: 13, fontWeight: 600 }}>
              La cámara se activará en 3 segundos automáticamente
            </p>
          </div>
        </div>
      ) : (
        /* ── Estado: cámara activa ── */
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Video + canvas */}
          <div style={{ position: 'relative', width: '100%', borderRadius: 20, overflow: 'hidden', background: '#000', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 20 }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 20 }}
            />
          </div>

          {/* Panel de estado */}
          <div style={{
            background: '#fff', borderRadius: 16, padding: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>

            {/* Indicador de rostro */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: rostroPresente ? '#d1fae5' : '#fee2e2',
            }}>
              {rostroPresente ? <Smile size={20} color="#065f46" /> : <User size={20} color="#991b1b" />}
              <span style={{ fontWeight: 600, fontSize: 14, color: rostroPresente ? '#065f46' : '#991b1b' }}>
                {rostroPresente ? 'Rostro detectado' : 'No se detecta rostro'}
              </span>
            </div>

            {/* Indicador de distancia */}
            {rostroPresente && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: distanciaOk ? '#dbeafe' : '#fef3c7',
              }}>
                {distanciaOk ? <CheckCircle2 size={20} color="#1e40af" /> : <ArrowLeftRight size={20} color="#92400e" />}
                <span style={{ fontWeight: 600, fontSize: 14, color: distanciaOk ? '#1e40af' : '#92400e' }}>
                  {distanciaOk ? 'Posición correcta' : 'Ajusta tu distancia a la cámara'}
                </span>
              </div>
            )}

            {/* Barra de cuenta regresiva */}
            {contador > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Registrando en...</span>
                  <span style={{ fontSize: 13, color: '#0f7cc0', fontWeight: 700 }}>{contador}s</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg,#0f7cc0,#00e5ff)',
                    width: `${((5 - contador) / 5) * 100}%`,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Mensaje de estado */}
            {mensaje ? (
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>{mensaje}</p>
            ) : !modelosCargados ? (
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>Cargando modelos de detección...</p>
            ) : !rostroPresente ? (
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>Ubícate frente a la cámara y espera 5 segundos</p>
            ) : distanciaOk && contador === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>Mantente quieto, iniciando cuenta regresiva...</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
