'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as faceapi from 'face-api.js';
import { useAppContext } from '@/context/AppContext';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { usuario } = useAppContext();
  const router = useRouter();
  // const searchParams = useSearchParams();

  const [modelosCargados, setModelosCargados] = useState(false);
  const [rostroPresente, setRostroPresente] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [contador, setContador] = useState(0);
  const [registrado, setRegistrado] = useState(false);
  const [ubicacion, setUbicacion] = useState({ lat: null, lon: null });
  const [isMobile, setIsMobile] = useState(false);
  const [mostrarCamara, setMostrarCamara] = useState(false);

  // let tipoMarcaje = searchParams.get('tipoMarcaje');
  let id_usuario = usuario;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) videoRef.current.srcObject = stream;
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');

    setModelosCargados(true);
  }
  const obtenerUbicacion = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ lat: latitude, lon: longitude });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true }
      );
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrarCamara(true);
      startCamera();
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUbicacion({ lat: latitude, lon: longitude });
          console.log('📍 Mi ubicación actual:', latitude, longitude);
        },
        (error) => {
          console.error('❌ Error al obtener geolocalización:', error.message);
        },
        { enableHighAccuracy: true }
      );
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const obtenerDescriptor = async () => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 });
    return await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor().withFaceExpressions();
  };

  const registrarPersona = async () => {
    try {
      const deteccion = await obtenerDescriptor();
      if (!deteccion) return setMensaje('No se detectó rostro');

      const descriptor = Array.from(deteccion.descriptor);
      let ubicacionActual;
      try {
        setMensaje('📡 Obteniendo ubicación, espera un momento...');
        ubicacionActual = await obtenerUbicacion();
        setUbicacion(ubicacionActual);
        setMensaje(`📍 Ubicación confirmada: ${ubicacionActual.lat}, ${ubicacionActual.lon}`);
      } catch (err) {
        setMensaje('❌ Error al obtener ubicación: ' + err.message);
        return;
      }
      const res = await fetch('/api/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario,
          latitude: ubicacionActual.lat,
          longitude: ubicacionActual.lon,
          descriptor,
        }),
      });

      const data = await res.json();
      setMensaje(data.mensaje);
      setRegistrado(true);
    } catch (error) {
      console.error(error);
      console.log('❌ Error al registrar persona');
    }
  };

  useEffect(() => {
    if (!modelosCargados || registrado) return;

    let intervalo = setInterval(async () => {
      const deteccion = await obtenerDescriptor();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!deteccion) {
        setRostroPresente(false);
        setMensaje('❌ No se detecta un rostro, ubícate frente a la cámara');
        return;
      }

      setRostroPresente(true);
      faceapi.matchDimensions(canvas, { width: videoRef.current.width, height: videoRef.current.height });
      const resized = faceapi.resizeResults(deteccion, { width: videoRef.current.width, height: videoRef.current.height });
      faceapi.draw.drawDetections(canvas, resized);

      if (!contador && !registrado) {
        setMensaje('Mantente quieto por 5 segundos ⏳');
        setContador(5);
        let t = setInterval(() => {
          setContador((c) => {
            if (c <= 1) {
              clearInterval(t);
              setMensaje('Registrando...');
              registrarPersona();
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [modelosCargados, registrado, contador]);

  useEffect(() => {
    if (registrado) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [registrado]);

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          margin: '0 auto',
          backgroundColor: 'transparent',
          padding: '0px',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
        }}
      >
        {registrado ? (
          <div style={{ textAlign: 'center', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ color: '#059669' }}>✅ Registro exitoso</h2>
            <p style={{ color: 'black' }}>Ahora marca tu Ingreso, Por favor espera, redirigiendo...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
            {!mostrarCamara ? (
              <div style={{ flex: '1 1 100%', textAlign: 'center', padding: '0px' }}>
                <h2 style={{ color: '#374151', marginBottom: '10px' }}>⏳Primero debes registrarte</h2>

                <p style={{ color: '#4b5563', marginBottom: '10px' }}>Por favor lee estas recomendaciones antes de continuar:</p>
                <ul style={{ textAlign: 'left', display: 'inline-block', color: '#4b5563', lineHeight: '1.8' }}>
                  <li>💡Busca un lugar con iluminación.</li>
                  <li>👓No uses gafas ni mascarilla.</li>
                  <li>🎥Mantén tu rostro centrado.</li>
                  <li>🌗Evita fondos muy oscuros.</li>
                </ul>
                <p style={{ marginTop: '10px', color: 'red' }}>La cámara se activará en 10 segundos.</p>
              </div>
            ) : (
              <>
                <h2 style={{ color: '#374151', marginBottom: '10px' }}>Registro</h2>
                <div style={{ position: 'relative', width: 400, height: 300, borderRadius: '20px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    width={350}
                    height={300}
                    style={{
                      borderRadius: '20px',
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={500}
                    style={{
                      position: 'absolute',
                      top: -30,
                      left: 0,
                    }}
                  />
                </div>

                {/* 📋 Panel lateral */}
                <div style={{ flex: '1 1 300px', width: '100%' }}>
                  <h3 style={{ fontWeight: 'bold', color: rostroPresente ? 'green' : 'red' }}>Por favor mire la cámara fijamente.</h3>
                  <p style={{ fontWeight: 'bold', color: rostroPresente ? 'green' : 'red' }}>{mensaje}</p>
                  {contador > 0 && <p style={{ fontWeight: 'bold', color: '#f59e0b' }}>⏳ Registrando en {contador} segundos...</p>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
