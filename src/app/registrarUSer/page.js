'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as faceapi from 'face-api.js';
import { cargarModelos } from '@/lib/faceModels';
import { useAppContext } from '@/context/AppContext';
import { Cabecera, Pie } from '@/components/marca';
import {
  Camera,
  CircleCheck,
  Contrast,
  Crosshair,
  Glasses,
  IdCard,
  Lightbulb,
  LoaderCircle,
  MoveHorizontal,
  ScanFace,
  Smartphone,
  TriangleAlert,
  UserRound,
} from 'lucide-react';

const CONSEJOS = [
  [Lightbulb, 'Busca un lugar bien iluminado'],
  [Glasses, 'Retira gafas o tapabocas si los usas'],
  [Crosshair, 'Mantén tu rostro centrado en la cámara'],
  [Contrast, 'Evita fondos muy oscuros o muy brillantes'],
  [Smartphone, 'Mantente quieto durante el registro'],
];

// Algunos mensajes traen un emoji al inicio ("📡 …"); se muestran sin él.
const sinEmoji = (texto = '') => texto.replace(/^[^\p{L}\p{N}¡¿]+/u, '');

export default function RegistrarUsuario() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isDetectingRef = useRef(false);
  const contadorActivoRef = useRef(false);
  const streamRef = useRef(null);
  const { usuario } = useAppContext();
  const router = useRouter();

  const [modelosCargados, setModelosCargados] = useState(false);
  const [rostroPresente, setRostroPresente] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [contador, setContador] = useState(0);
  const [registrado, setRegistrado] = useState(false);
  // Antes se mostraba "¡Registro exitoso!" aunque el servidor respondiera con error.
  const [registroOk, setRegistroOk] = useState(true);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [distanciaOk, setDistanciaOk] = useState(false);

  const id_usuario = usuario;

  // ── Dibujo canvas ──────────────────────────────────────────────────────────
  // Paleta de Síntesis Gestión y sin shadowBlur (de lo más costoso del canvas
  // en celulares), igual que la superposición de la pantalla de marcaje.

  const fuenteCanvas = (px) => `700 ${px}px ${getComputedStyle(document.body).fontFamily}`;

  const dibujarGuiaRostro = (ctx, cw, ch) => {
    const cx = cw / 2;
    const cy = ch * 0.45;
    const rx = cw * 0.22;
    const ry = ch * 0.32;

    // Velo azul marino con el óvalo "perforado" (regla evenodd).
    ctx.fillStyle = 'rgba(0, 38, 66, 0.45)';
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill('evenodd');

    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -(Date.now() / 60) % 20;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = fuenteCanvas(Math.round(cw * 0.038));
    ctx.textAlign = 'center';
    ctx.fillText('Ubica tu rostro aquí', cx, cy + ry + ch * 0.07);
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
    ctx.font = fuenteCanvas(fontSize);
    ctx.textAlign = 'center';
    const pw = ctx.measureText(label).width + 24;
    const ph = fontSize + 14;
    ctx.fillStyle = 'rgba(0, 38, 66, 0.7)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cw / 2 - pw / 2, py - ph + 4, pw, ph, 8);
    else ctx.rect(cw / 2 - pw / 2, py - ph + 4, pw, ph);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(label, cw / 2, py);
    ctx.restore();
  };

  const dibujarRecuadroRostro = (ctx, box, estado) => {
    const { x, y, width, height } = box;
    const cornerLen = Math.min(width, height) * 0.22;
    const color =
      estado === 'registrando' ? '#4ADE80' :
      estado === 'listo'       ? '#F5B041' :
      '#5AB4F5';

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;

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
    streamRef.current = stream;
    asignarStreamAlVideo(stream);
    setModelosCargados(true);
  }

  // Asigna el stream al <video> reintentando por rAF (mismo arreglo que la
  // pantalla de marcaje): si getUserMedia resolvía antes de que React montara
  // el <video>, el viejo `if (videoRef.current)` descartaba el stream y la
  // cámara quedaba encendida pero sin imagen.
  const asignarStreamAlVideo = (stream, intentos = 0) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    } else if (intentos < 120) {
      requestAnimationFrame(() => asignarStreamAlVideo(stream, intentos + 1));
    }
  };

  // Antes la cámara nunca se apagaba al salir de esta página (el indicador
  // seguía encendido tras el registro).
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

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
    setRegistroOk(!!data.ok);
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

  const estado = mensaje
    ? { titulo: sinEmoji(mensaje), detalle: registrando ? 'No muevas la cámara.' : '' }
    : !modelosCargados
      ? { titulo: 'Preparando la cámara', detalle: 'Cargando el reconocimiento facial…' }
      : !rostroPresente
        ? { titulo: 'Ubícate frente a la cámara', detalle: 'El registro empieza solo cuando tu rostro esté en posición.' }
        : !distanciaOk
          ? { titulo: 'Ajusta tu distancia', detalle: 'Acércate o aléjate hasta quedar dentro del recuadro.' }
          : { titulo: 'Mantente quieto', detalle: 'Iniciando la cuenta regresiva…' };

  return (
    <div className="sg-app">
      <Cabecera modulo="Registro biométrico" />

      <main className="sg-cuerpo">
        {registrado ? (
          /* ── Estado: registrado ── */
          <section className="sg-panel sg-estado" aria-live="polite">
            {registroOk ? (
              <>
                <div className="sg-estado-ico sg-ok">
                  <CircleCheck size={36} aria-hidden="true" />
                </div>
                <h1 className="sg-titulo">Registro completado</h1>
                <p className="sg-sub">Tu rostro quedó registrado. Ya puedes marcar tu asistencia con reconocimiento facial.</p>
              </>
            ) : (
              <>
                <div className="sg-estado-ico sg-alerta">
                  <TriangleAlert size={32} aria-hidden="true" />
                </div>
                <h1 className="sg-titulo">No pudimos guardar el registro</h1>
                <p className="sg-sub">{sinEmoji(mensaje) || 'Intenta de nuevo en unos minutos.'}</p>
              </>
            )}
            <div className="sg-barra sg-temporizada" style={{ '--dur': '4s' }}>
              <span />
            </div>
            <p className="sg-nota" style={{ marginTop: 10 }}>
              Te llevaremos al inicio en unos segundos…
            </p>
          </section>
        ) : !mostrarCamara ? (
          /* ── Estado: instrucciones ── */
          <section className="sg-panel">
            <h1 className="sg-titulo">Registro biométrico</h1>
            <p className="sg-sub">Vamos a registrar tu rostro para tus próximos marcajes.</p>
            <span className="sg-chip">
              <IdCard size={14} aria-hidden="true" /> Cédula {id_usuario}
            </span>

            <ul className="sg-consejos">
              {CONSEJOS.map(([Icono, texto], i) => (
                <li key={texto} style={{ '--i': i }}>
                  <span className="sg-dato-ico">
                    <Icono size={18} aria-hidden="true" />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>

            {/* la cámara se activa a los 3 s (useEffect de inicio automático) */}
            <div className="sg-barra sg-temporizada" style={{ '--dur': '3s', marginTop: 22 }}>
              <span />
            </div>
            <p className="sg-nota" style={{ marginTop: 10 }}>
              <Camera size={15} aria-hidden="true" /> La cámara se activará en unos segundos.
            </p>
          </section>
        ) : (
          /* ── Estado: cámara activa ── */
          <>
            <section className="sg-panel sg-panel-compacto">
              <div className="sg-paso" style={{ marginBottom: 12 }}>
                <span className="sg-paso-ico">
                  <ScanFace size={24} aria-hidden="true" />
                </span>
                <span className="sg-paso-txt">
                  <strong>Registro biométrico</strong>
                  <small>Cédula {id_usuario}</small>
                </span>
              </div>

              <div className="sg-video">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} />
              </div>

              <div className="sg-indicadores">
                <div className={`sg-indicador${rostroPresente ? ' sg-ok' : ''}`}>
                  {rostroPresente ? <CircleCheck size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
                  {rostroPresente ? 'Rostro detectado' : 'Sin rostro'}
                </div>
                <div className={`sg-indicador${!rostroPresente ? '' : distanciaOk ? ' sg-ok' : ' sg-alerta'}`}>
                  {rostroPresente && distanciaOk ? <CircleCheck size={16} aria-hidden="true" /> : <MoveHorizontal size={16} aria-hidden="true" />}
                  {!rostroPresente ? 'Posición pendiente' : distanciaOk ? 'Posición correcta' : 'Ajusta la distancia'}
                </div>
              </div>
            </section>

            <section className="sg-panel sg-panel-compacto" aria-live="polite">
              {contador > 0 ? (
                <div className="sg-tiempo" style={{ marginBottom: 0 }}>
                  <div className="sg-tiempo-fila">
                    <span>Registrando en</span>
                    <span className="sg-tiempo-seg">{contador}s</span>
                  </div>
                  <div className="sg-barra">
                    <span style={{ width: `${((5 - contador) / 5) * 100}%` }} />
                  </div>
                  <p className="sg-nota" style={{ marginTop: 10 }}>
                    Mantente quieto, mirando a la cámara.
                  </p>
                </div>
              ) : (
                <div className="sg-paso">
                  <span className={`sg-paso-ico${registrando ? '' : ' sg-neutro'}`}>
                    {registrando ? (
                      <LoaderCircle size={22} className="sg-gira" aria-hidden="true" />
                    ) : (
                      <Crosshair size={22} aria-hidden="true" />
                    )}
                  </span>
                  <span className="sg-paso-txt">
                    <strong>{estado.titulo}</strong>
                    {estado.detalle && <small>{estado.detalle}</small>}
                  </span>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Pie />
    </div>
  );
}
