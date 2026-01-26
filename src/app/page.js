'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './indexPrincipal.css';
import * as faceapi from 'face-api.js';
import { useAppContext } from '@/context/AppContext';

export default function Home() {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const router = useRouter();
  const { usuario, setUsuario, isAuth, setIsAuth } = useAppContext();
  const [rostroCoincide, setRostroCoincide] = useState(true);
  const [modelosCargados, setModelosCargados] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [listado, setListado] = useState([]);
  const [reto, setReto] = useState('');
  const [ultimoReto, setUltimoReto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mensaje2, setMensaje2] = useState('');
  const [validando, setValidando] = useState(false);
  const [contador, setContador] = useState(0);
  const [timerId, setTimerId] = useState(null);
  const [rostroPresente, setRostroPresente] = useState(false);
  const [ojosCerrados, setOjosCerrados] = useState(false);
  const [parpadeos, setParpadeos] = useState(0);
  const [tiporegistro, setTiporegistro] = useState(false);
  const [giroDetectado, setGiroDetectado] = useState(false);
  const canvasRef = useRef(null);
  const [cedula, setCedula] = useState('');
  const [iniciarProceso, setIniciarProceso] = useState(false);
  const [tipoSMarcaje, setTipoMarcaje] = useState([]);
  const [tpMarca, setTpMarca] = useState([]);
  const [geoPermitida, setGeoPermitida] = useState({
    lat: 0,
    lon: 0,
    radio: 50,
  });
  let isregistro = false;
  const [ubicacion, setUbicacion] = useState({ lat: null, lon: null });
  const [isMobile, setIsMobile] = useState(false);
  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const [direccion, setDireccion] = useState();
  const [hora, setHora] = useState();
  const [rango, setRango] = useState();
  const [direccionActual, setDireccionActual] = useState();
  useEffect(() => {
    ObtenerTipos();
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMensaje2('📡 Cargando su informacion, Por favor espere...');
    if (!navigator.geolocation) {
      console.log('Geolocalización no soportada por el navegador');
      return;
    }

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
  }, []);

  const ObtenerTipos = async () => {
    try {
      const res = await fetch('/api/ListadoMarcajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.ok) {
        setTipoMarcaje(data.result);
        setLoadingTipos(false);
      }
    } catch (error) {
      console.error(error);
      console.log('Error al registrar la persona');
    }
  };

  const calcularDistancia = (userLat, userLon) => {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(geoPermitida.lat - userLat);
    const dLon = toRad(geoPermitida.lon - userLon);

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLat)) * Math.cos(toRad(geoPermitida.lat)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!ubicacion.lat || !ubicacion.lon) return;

    const distancia = calcularDistancia(ubicacion.lat, ubicacion.lon);
    setRango(distancia);
  }, [ubicacion, geoPermitida]);

  const estaDentroArea = rango !== null && rango <= geoPermitida.radio;

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) videoRef.current.srcObject = stream;
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
    setModelosCargados(true);
  }

  const stopCamera = async () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const ValidarMarcaje = async (cedula, tipoMarcaje2) => {
    try {
      const id_usuario = cedula;
      const tipoMarcaje = tipoMarcaje2;
      setIniciarProceso(true);
      setLoadingInit(true);
      const res = await fetch('/api/validarMarcaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario, tipoMarcaje }),
      });
      const data = await res.json();
      if (data.ok) {
        setGeoPermitida({
          lat: parseFloat(data.result.lat),
          lon: parseFloat(data.result.lon),
          radio: 300,
        });
        setDireccion(data.result.direccion);
        setHora(data.result.horario);
        if (data.result.ExistsUser === '0') {
          router.push('/notFoundUser');
        } else {
          if (data.result.isregistrado === '0') {
            setLoadingInit();
            setUsuario(id_usuario);
            router.push(`/registrarUSer?iosono=${id_usuario}`);
          } else {
            if (data.result.marcado === '1') {
              router.push('/about');
              stopCamera();
              return;
            }
            if (data.result.marcado === '0') {
              startCamera();
              setMensaje2('');
              setLoadingInit();
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      console.log('Error al registrar la persona');
    }
  };

  const handleStart = (op) => {
    if (!cedula || !op.CODE) {
      alert('⚠️ Debes ingresar tu cédula y seleccionar un tipo de registro.');
      return;
    }
    setTpMarca(op.CODE);
    ValidarMarcaje(cedula, op.CODE);
  };
  const horaFormateada = hora?.toString().substring(0, 5);

  useEffect(() => {
    setMensaje2('📡 Obteniendo ubicación, espera un momento...');
    if (ubicacion.lon) {
      const direubi = coordenadasATexto(ubicacion.lat, ubicacion.lon);
      setDireccionActual(direubi);
    }
  }, [ubicacion]);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/welcome.mp3');
    console.log(isregistro);
    setTiporegistro(isregistro === 'true');
  }, [isregistro]);

  const obtenerDescriptor = async () => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 });
    const deteccion = await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor().withFaceExpressions();
    return deteccion || null;
  };

  const coordenadasATexto = async (lat, lon) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MiApp/1.0',
        },
      });

      const data = await res.json();

      if (!data || !data.display_name) return null;

      return data.display_name;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  };
  const dentroArea = (userLat, userLon) => {
    const R = 6371000; // metros
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(geoPermitida.lat - userLat);
    const dLon = toRad(geoPermitida.lon - userLon);

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLat)) * Math.cos(toRad(geoPermitida.lat)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distancia = R * c; // METROS
    // setRango(distancia);
    return distancia <= geoPermitida.radio;
  };

  const iniciarContador = () => {
    if (timerId) clearInterval(timerId);
    setContador(10);
    const id = setInterval(() => {
      setContador((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setMensaje('⏱️ Tiempo agotado, intenta de nuevo');
          setValidando(false);
          setReto('');
          setParpadeos(0);
          setGiroDetectado(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerId(id);
  };

  const generarReto = () => {
    const retos = ['Sonreír', 'Mover la cabeza'];
    let nuevoReto = retos[Math.floor(Math.random() * retos.length)];
    while (nuevoReto === ultimoReto) {
      nuevoReto = retos[Math.floor(Math.random() * retos.length)];
    }
    setReto(nuevoReto);
    setUltimoReto(nuevoReto);
    setMensaje('');
    setValidando(true);
    setParpadeos(0);
    setGiroDetectado(false);
    iniciarContador();
  };

  const reiniciarSistema = () => {
    setReto('');
    setUltimoReto('');
    setMensaje('');
    setValidando(false);
    setParpadeos(0);
    setGiroDetectado(false);
    setContador(0);
    setRostroPresente(false);
    startCamera();
    setRostroCoincide(true);
  };

  const validarPersona = async (descriptor) => {
    try {
      if (!descriptor || descriptor.length === 0) {
        setMensaje2('❌ No se detectó el rostro. Intenta de nuevo.');
        return;
      }
      const id_usuario = cedula;
      const tipoMarcaje = tpMarca;

      if (!id_usuario) {
        setMensaje2('❌ No se encontró el usuario.');
        return;
      }
      if (!tipoMarcaje) {
        setMensaje2('❌ No se encontró el tipo de marcaje.');
        return;
      }

      const res = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario,
          descriptor: Array.from(descriptor),
          latitude: ubicacion.lat,
          longitude: ubicacion.lon,
          enSede: dentroArea(ubicacion.lat, ubicacion.lon),
          rangodif: rango,
          ubicacionMarcada: direccionActual,
          tipoMarcaje,
        }),
      });

      const data = await res.json();
      console.log(data);

      if (data.ok) {
        if (data.coincide == 1) {
          // if (audioRef.current) audioRef.current.play();
          stopCamera();
          setMensaje2(data.mensaje);
          router.push('/about');
        }
        if (data.coincide == 0) {
          stopCamera();
          setLoadingInit(true);
          setRostroCoincide(false);
          iniciarContador();
          setTimeout(() => {
            reiniciarSistema();
            setLoadingInit(false);
          }, 5000);
          setMensaje2(data.mensaje);
          // setLoadingInit(false);
        }
      } else {
        router.push('/error');
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ Error en validarPersona');
    }
  };

  useEffect(() => {
    if (!modelosCargados) return;
    if (!videoRef.current) return;

    let intervalo = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }
      if (!canvas) return;

      const deteccion = await obtenerDescriptor();

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!deteccion) {
        setRostroPresente(false);
        return;
      }

      setRostroPresente(true);

      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };

      faceapi.matchDimensions(canvas, displaySize);

      const resizedDetections = faceapi.resizeResults(deteccion, displaySize);
      faceapi.draw.drawDetections(canvas, resizedDetections);

      if (!validando) generarReto();

      if (validando) {
        if (reto === 'Sonreír' && deteccion.expressions.happy > 0.7) {
          setMensaje('✅✅ Reto cumplido: Sonrisa detectada');
          setValidando(false);
          if (timerId) clearInterval(timerId);
          validarPersona(deteccion.descriptor);
          setLoadingInit(true);
          stopCamera();
        }

        if (reto === 'Mover la cabeza') {
          const nose = deteccion.landmarks.getNose();
          const noseX = nose[3].x;
          const box = deteccion.detection.box;
          const centerX = box.x + box.width / 2;
          const desplazamiento = noseX - centerX;

          if (Math.abs(desplazamiento) > 30 && !giroDetectado) {
            setGiroDetectado(true);
            setMensaje('✅✅ Reto cumplido: Movimiento detectado');
            setValidando(false);
            if (timerId) clearInterval(timerId);
            validarPersona(deteccion.descriptor);
            setLoadingInit(true);
            stopCamera();
          }
        }
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [reto, modelosCargados, validando, rostroPresente, parpadeos, ojosCerrados, giroDetectado]);

  const formatFechaHora = (isoString) => {
    const date = new Date(isoString);
    return {
      fecha: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      hora: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`,
    };
  };

  const filas = [];
  listado.forEach((u) => {
    u.asistencias?.forEach((a) => {
      const { fecha, hora } = formatFechaHora(a);
      filas.push({ nombre: u.nombre, fecha, hora });
    });
  });

  return (
    <div style={{ overflow: '0' }}>
      {!iniciarProceso ? (
        <div className="container">
          <div>
            <h2 className="titulo">BIOMETRIA</h2>

            <input type="text" className="inputperso" placeholder="Ingrese su cédula" value={cedula} onChange={(e) => setCedula(e.target.value)} />

            <p className="subtitulo">Selecciona el tipo de registro</p>

            {!loadingTipos ? (
              <div className="lista">
                {tipoSMarcaje.map((op, index) => (
                  <div key={index} className="opcion" onClick={() => handleStart(op)}>
                    <div className="icono">➡️</div>
                    <div className="texto">
                      <h3>&nbsp;&nbsp; {op.Nombre}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cargando">
                <div className="spinner" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {loadingInit ? (
            <div className="container" style={{ backgroundColor: '#f9fafb', color: 'black' }}>
              {rostroCoincide ? (
                <div className="cargando">
                  <div className="spinner" />
                  <p className="mensaje">{mensaje2}</p>
                </div>
              ) : (
                <div className="cargando">
                  <img src="./images/found.gif"></img>
                  <h4 className="mensaje">{mensaje2}</h4>
                  {contador > 0 && <p className="contador">⏳ Tiempo: {contador}s</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="proceso">
              <p className="fecha">
                {capitalize(
                  new Date().toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                )}{' '}
                {new Date().toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="fecha">
                Lugar Trabajo: <span className="fechahijo">{direccion}</span>{' '}
              </p>

              <div className="video-container">
                <video ref={videoRef} autoPlay muted />
                <canvas ref={canvasRef} />
              </div>
              <p className="fecha">
                Inicio jornada: <span className="fechahijo">{horaFormateada} AM</span>
              </p>

              <p className="fecha">
                Tu Ubicacion Actual: <span className="fechahijo">{direccionActual}</span>
              </p>
              <div className="panel">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '20px',
                    margin: '20px auto',
                    borderRadius: '15px',
                    background: 'linear-gradient(135deg, #e0f7fa, #80deea)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxWidth: '420px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      marginBottom: '15px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: estaDentroArea ? '#155724' : '#721c24',
                      background: estaDentroArea ? 'linear-gradient(135deg, #d4edda, #a5d6a7)' : 'linear-gradient(135deg, #f8d7da, #e57373)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>📍</span>
                    {estaDentroArea ? 'Dentro de tu zona de trabajo' : 'Fuera de tu zona de trabajo'}
                  </div>

                  {/* Estado de detección y retos */}
                  {reto && rostroPresente ? (
                    <>
                      <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#004d40' }}>Realiza el siguiente gesto</p>

                      <h2 style={{ color: '#00695c', margin: 0 }}>
                        {reto === 'Mover la cabeza' ? 'Gira tu cabeza hacia la izquierda y la derecha 👈👉' : reto}
                      </h2>

                      {contador > 0 && (
                        <p style={{ marginTop: '15px', fontSize: '16px', color: '#37474f' }}>
                          ⏳ Tiempo: <strong>{contador}s</strong>
                        </p>
                      )}

                      {mensaje && (
                        <p
                          style={{
                            marginTop: '10px',
                            color: '#2e7d32',
                            fontWeight: 'bold',
                            fontSize: '16px',
                          }}
                        >
                          ✅ {mensaje}
                        </p>
                      )}
                    </>
                  ) : !rostroPresente ? (
                    <h2 style={{ color: '#00695c', fontSize: '20px', margin: 0 }}>Ubícate frente y al centro de la cámara 🎯</h2>
                  ) : null}
                </div>

                <div>
                  <p>{tiporegistro}</p>
                  {tiporegistro && (
                    <button onClick={registrarPersona} disabled={!modelosCargados} className={`btn ${!modelosCargados ? 'disabled' : ''}`}>
                      Registrarme
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
