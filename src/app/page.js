"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as faceapi from "face-api.js";
import { cargarModelos, cargarExpresiones } from "@/lib/faceModels";
import { marcar, resumenMarcaje, limpiarMarcas } from "@/lib/perf";
import { useAppContext } from "@/context/AppContext";
import { Cabecera, Pie } from "@/components/marca";
import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  CircleCheck,
  ClipboardList,
  Clock,
  Coffee,
  Crosshair,
  DoorClosed,
  DoorOpen,
  Fingerprint,
  GraduationCap,
  IdCard,
  Lightbulb,
  LogIn,
  LogOut,
  MapPin,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Smile,
  Sparkles,
  Timer,
  TriangleAlert,
  Utensils,
} from "lucide-react";

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
  const [reto, setReto] = useState("");
  const [ultimoReto, setUltimoReto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensaje2, setMensaje2] = useState("");
  const [validando, setValidando] = useState(false);
  const [contador, setContador] = useState(0);
  // Ref (no estado): el id del contador se lee dentro de closures del loop de
  // detección; como estado quedaba obsoleto y el clearInterval fallaba.
  const timerRef = useRef(null);
  const [rostroPresente, setRostroPresente] = useState(false);
  const [ojosCerrados, setOjosCerrados] = useState(false);
  const [parpadeos, setParpadeos] = useState(0);
  const [tiporegistro, setTiporegistro] = useState(false);
  const [giroDetectado, setGiroDetectado] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [movimientoConfirmado, setMovimientoConfirmado] = useState(false);
  const canvasRef = useRef(null);
  const isDetectingRef = useRef(false);
  const primeraInferenciaRef = useRef(false);
  const rostroMarcadoRef = useRef(false);
  const procesandoRef = useRef(false);
  const movimientoConfirmadoRef = useRef(false);
  const generandoRetoRef = useRef(false);
  const histNarizRef = useRef([]);
  const intentosFallidosRef = useRef(0);
  const fotoBlobRef = useRef(null);
  const streamRef = useRef(null);
  const rangoRef = useRef(null);
  const ubicacionRef = useRef({ lat: null, lon: null });
  const geoPermitidaRef = useRef({ lat: 0, lon: 0, radio: 50 });
  const direccionActualRef = useRef(null);
  const [cedula, setCedula] = useState("");
  const [errorCedula, setErrorCedula] = useState("");
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
  const [direccion, setDireccion] = useState();
  const [hora, setHora] = useState();
  const [rango, setRango] = useState();
  const [direccionActual, setDireccionActual] = useState();
  useEffect(() => {
    ObtenerTipos();
    // Precarga de modelos mientras el usuario digita la cédula: saca los ~2 MB
    // de pesos del camino crítico. Si falla (red), startCamera() reintenta.
    cargarModelos().catch(() => {});
    // Prefetch de las rutas a las que este flujo puede redirigir.
    try {
      router.prefetch("/about");
      router.prefetch("/notFoundUser");
      router.prefetch("/registrarUSer");
      router.prefetch("/error");
    } catch {}
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      // El stream puede seguir vivo sin <video> montado (entre intentos): si
      // el usuario sale de la página, apagar la cámara igualmente.
      stopCamera();
    };
  }, []);

  useEffect(() => {
    setMensaje2("📡 Cargando su informacion, Por favor espere...");
    if (!navigator.geolocation) {
      console.log("Geolocalización no soportada por el navegador");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        ubicacionRef.current = { lat: latitude, lon: longitude };
        setUbicacion({ lat: latitude, lon: longitude });
        console.log("📍 Mi ubicación actual:", latitude, longitude);
      },
      (error) => {
        console.error("❌ Error al obtener geolocalización:", error.message);
      },
      { enableHighAccuracy: true },
    );
  }, []);

  const ObtenerTipos = async () => {
    try {
      const res = await fetch("/api/ListadoMarcajes");
      const data = await res.json();
      if (data.ok) {
        setTipoMarcaje(data.result);
        setLoadingTipos(false);
      }
    } catch (error) {
      console.error(error);
      console.log("Error al registrar la persona");
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
    rangoRef.current = distancia;
    setRango(distancia);
  }, [ubicacion, geoPermitida]);

  const estaDentroArea = rango !== null && rango <= geoPermitida.radio;

  async function startCamera() {
    // En el reintento tras un primer "no coincide" la cámara no se apagó:
    // se reutiliza el mismo stream y se evita un nuevo getUserMedia (en
    // celulares cuesta entre 0.3 y 1 s volver a abrir la cámara).
    const streamVivo = streamRef.current?.getVideoTracks().some((t) => t.readyState === "live");
    // Permiso de cámara y carga de modelos en paralelo. Si los modelos ya se
    // precargaron al montar la página, cargarModelos() resuelve al instante.
    const [stream] = await Promise.all([
      streamVivo
        ? streamRef.current
        : navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          }),
      cargarModelos(),
    ]);
    streamRef.current = stream;
    // Asignación con reintento: en el reinicio tras un intento fallido, el
    // stream puede resolver antes de que React re-monte el <video>. El viejo
    // `if (videoRef.current)` descartaba el stream y la cámara quedaba muerta.
    asignarStreamAlVideo(stream);
    setModelosCargados(true);
  }

  // Detiene el stream guardado en streamRef y no solo el del <video>: mientras
  // se verifica la identidad el <video> está desmontado, pero el stream sigue
  // vivo para poder reutilizarlo en el reintento.
  const stopCamera = async () => {
    [streamRef.current, videoRef.current?.srcObject].forEach((stream) => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    });
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Asigna el stream al <video> reintentando por rAF: al paralelizar, el
  // stream puede resolver antes de que React haya montado el elemento.
  const asignarStreamAlVideo = (stream, intentos = 0) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    } else if (intentos < 120) {
      requestAnimationFrame(() => asignarStreamAlVideo(stream, intentos + 1));
    }
  };

  const ValidarMarcaje = async (cedula, tipoMarcaje2) => {
    // Cámara solicitada EN PARALELO con la consulta al servidor. Si la
    // validación falla o redirige, los tracks se detienen de inmediato.
    const streamPromise = navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } })
      .catch(() => null);
    const detenerStream = () => {
      streamPromise.then((s) => s && s.getTracks().forEach((t) => t.stop()));
    };

    try {
      const id_usuario = cedula;
      const tipoMarcaje = tipoMarcaje2;
      intentosFallidosRef.current = 0;
      fotoBlobRef.current = null;
      setIniciarProceso(true);
      setLoadingInit(true);
      setMensaje2("Verificando tu información...");
      limpiarMarcas();
      marcar("boton-registrar");

      const res = await fetch("/api/validarMarcaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario, tipoMarcaje }),
      });
      const data = await res.json();
      marcar("respuesta-validarMarcaje");

      if (!data.ok || !data.result || Object.keys(data.result).length === 0) {
        detenerStream();
        setErrorCedula("Cédula no encontrada. Verifica el número ingresado.");
        setIniciarProceso(false);
        setLoadingInit(true);
        return;
      }

      const geo = { lat: parseFloat(data.result.lat), lon: parseFloat(data.result.lon), radio: 300 };
      geoPermitidaRef.current = geo;
      setGeoPermitida(geo);
      setDireccion(data.result.direccion);
      setHora(data.result.horario);

      if (String(data.result.ExistsUser) === "0") {
        detenerStream();
        router.push("/notFoundUser");
        return;
      }

      if (String(data.result.isregistrado) === "0") {
        detenerStream();
        setUsuario(id_usuario);
        router.push(`/registrarUSer?iosono=${id_usuario}`);
        return;
      }

      if (String(data.result.marcado) === "1") {
        detenerStream();
        router.push("/about");
        return;
      }

      // Usuario existe, registrado y sin marcaje hoy → mostrar cámara
      setLoadingInit(false);
      setMensaje2("");
      try {
        const [stream] = await Promise.all([streamPromise, cargarModelos()]);
        if (!stream) throw new Error("Sin acceso a la cámara");
        marcar("camara-lista");
        streamRef.current = stream;
        asignarStreamAlVideo(stream);
        setModelosCargados(true);
        marcar("modelos-listos");
      } catch {
        setMensaje2("ERROR: No se pudo acceder a la cámara. Verifica que hayas dado permiso de cámara e intenta de nuevo.");
        setLoadingInit(true);
      }
    } catch (error) {
      console.error(error);
      detenerStream();
      setErrorCedula("Error de conexión. Verifica tu red e intenta de nuevo.");
      setIniciarProceso(false);
      setLoadingInit(true);
    }
  };

  const handleStart = (op) => {
    if (!cedula || !op.CODE) {
      alert("⚠️ Debes ingresar tu cédula y seleccionar un tipo de registro.");
      return;
    }
    setTpMarca(op.CODE);
    ValidarMarcaje(cedula, op.CODE);
  };
  const horaFormateada = hora?.toString().substring(0, 5);

  useEffect(() => {
    const obtenerDireccion = async () => {
      setMensaje2("📡 Obteniendo ubicación, espera un momento...");

      if (ubicacion.lat && ubicacion.lon) {
        try {
          const direubi = await coordenadasATexto(ubicacion.lat, ubicacion.lon);
          direccionActualRef.current = direubi;
          setDireccionActual(direubi);
        } catch (error) {
          console.error(error);
          direccionActualRef.current = "No se pudo obtener la dirección";
          setDireccionActual("No se pudo obtener la dirección");
        }
      }
    };

    obtenerDireccion();
  }, [ubicacion]);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/welcome.mp3");
    console.log(isregistro);
    setTiporegistro(isregistro === "true");
  }, [isregistro]);

  // Las expresiones faciales solo se calculan cuando el reto activo las
  // necesita ("Sonreír"). Medido: 214 ms/frame con expresiones vs 113 ms sin
  // ellas. La detección, los landmarks y todos los umbrales no cambian.
  //
  // Sin expresiones (presencia, movimiento previo y reto "Mover la cabeza")
  // basta el modelo tiny de landmarks: solo se lee la caja y la punta de la
  // nariz. Con expresiones se mantiene el modelo completo porque face-api
  // recorta el rostro para la red de expresiones a partir de los landmarks;
  // así el umbral happy > 0.7 se evalúa exactamente igual que antes.
  const obtenerDeteccionRapida = async (conExpresiones) => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 });
    const deteccion = faceapi.detectSingleFace(videoRef.current, options);
    if (conExpresiones) return (await deteccion.withFaceLandmarks().withFaceExpressions()) || null;
    return (await deteccion.withFaceLandmarks(true)) || null;
  };

  const obtenerDescriptorFinal = async () => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 });
    return (await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor()) || null;
  };

  const dibujarGuiaRostro = (ctx, canvasWidth, canvasHeight) => {
    const cx = canvasWidth / 2;
    const cy = canvasHeight * 0.45;
    const rx = canvasWidth * 0.22;
    const ry = canvasHeight * 0.32;

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -(Date.now() / 60) % 20;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `bold ${Math.round(canvasWidth * 0.038)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    ctx.fillText("Ubica tu rostro aquí", cx, cy + ry + canvasHeight * 0.07);
    ctx.restore();
  };

  const dibujarFeedbackDistancia = (ctx, box, canvasW, canvasH) => {
    const ratio = box.width / canvasW;

    let texto, flecha, color;
    if (ratio < 0.2) {
      texto = "Acércate a la cámara";
      flecha = "▲";
      color = "#ff9800";
    } else if (ratio > 0.6) {
      texto = "Aléjate un poco";
      flecha = "▼";
      color = "#ff5722";
    } else {
      return;
    }

    const fontSize = Math.round(canvasW * 0.048);
    const py = box.y > canvasH * 0.5 ? box.y - 18 : box.y + box.height + fontSize + 10;

    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;

    const label = `${flecha}  ${texto}  ${flecha}`;
    const metrics = ctx.measureText(label);
    const pw = metrics.width + 24;
    const ph = fontSize + 14;
    const px = canvasW / 2 - pw / 2;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.roundRect(px, py - ph + 4, pw, ph, 8);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.shadowBlur = 4;
    ctx.fillText(label, canvasW / 2, py);
    ctx.restore();
  };

  const dibujarRecuadroRostro = (ctx, box, estado) => {
    const { x, y, width, height } = box;
    const cornerLen = Math.min(width, height) * 0.22;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const color = estado === "cumplido" ? "#00e676" : estado === "validando" ? "#ffeb3b" : "#00e5ff";

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    const esquinas = [
      [
        [x, y + cornerLen],
        [x, y],
        [x + cornerLen, y],
      ],
      [
        [x + width - cornerLen, y],
        [x + width, y],
        [x + width, y + cornerLen],
      ],
      [
        [x, y + height - cornerLen],
        [x, y + height],
        [x + cornerLen, y + height],
      ],
      [
        [x + width - cornerLen, y + height],
        [x + width, y + height],
        [x + width, y + height - cornerLen],
      ],
    ];

    esquinas.forEach(([start, corner, end]) => {
      ctx.beginPath();
      ctx.moveTo(...start);
      ctx.lineTo(...corner);
      ctx.lineTo(...end);
      ctx.stroke();
    });

    ctx.shadowBlur = 0;
  };

  const coordenadasATexto = async (lat, lon) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "MiApp/1.0",
        },
      });

      const data = await res.json();

      if (!data || !data.display_name) return null;

      return data.display_name;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
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
    if (timerRef.current) clearInterval(timerRef.current);
    setContador(10);
    const id = setInterval(() => {
      setContador((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setMensaje("Se agotó el tiempo. Intenta de nuevo.");
          setValidando(false);
          setReto("");
          setParpadeos(0);
          setGiroDetectado(false);
          movimientoConfirmadoRef.current = false;
          generandoRetoRef.current = false;
          histNarizRef.current = [];
          setMovimientoConfirmado(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;
  };

  const generarReto = () => {
    if (procesandoRef.current || generandoRetoRef.current) return;
    generandoRetoRef.current = true;
    const retos = ["Sonreír", "Mover la cabeza"];
    let nuevoReto = retos[Math.floor(Math.random() * retos.length)];
    while (nuevoReto === ultimoReto) {
      nuevoReto = retos[Math.floor(Math.random() * retos.length)];
    }
    // Si el reto exige expresiones, asegurar que su red esté lista (en
    // condiciones normales ya cargó en segundo plano y esto no espera nada).
    if (nuevoReto === "Sonreír") cargarExpresiones().catch(() => {});
    setReto(nuevoReto);
    setUltimoReto(nuevoReto);
    setMensaje("");
    setValidando(true);
    setParpadeos(0);
    setGiroDetectado(false);
    marcar("reto-generado");
    iniciarContador();
  };

  const reiniciarSistema = () => {
    // Matar el contador residual del intento anterior: seguía corriendo tras
    // el reinicio y ~1 s después disparaba "Tiempo agotado", borrando el reto
    // activo del nuevo intento.
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    procesandoRef.current = false;
    generandoRetoRef.current = false;
    primeraInferenciaRef.current = false;
    rostroMarcadoRef.current = false;
    isDetectingRef.current = false;
    setProcesando(false);
    movimientoConfirmadoRef.current = false;
    histNarizRef.current = [];
    setMovimientoConfirmado(false);
    setReto("");
    setUltimoReto("");
    setMensaje("");
    setValidando(false);
    setParpadeos(0);
    setGiroDetectado(false);
    setContador(0);
    setRostroPresente(false);
    startCamera();
    setRostroCoincide(true);
  };

  const capturarFotoDesdeVideo = () =>
    new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) {
        resolve(null);
        return;
      }
      const c = document.createElement("canvas");
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext("2d").drawImage(video, 0, 0);
      // JPEG 0.8 en vez de PNG: ~10x menos peso y encode mucho más rápido,
      // calidad más que suficiente como evidencia fotográfica.
      c.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });

  const subirFotoS3 = async (blob) => {
    const form = new FormData();
    form.append("archivo", blob, `bio_${cedula}_${Date.now()}.jpg`);
    form.append("Folder", "SINTESISGESTION_ARCHIVADOR/IMGBIOMETRICO");
    // Con timeout: sin él, un S3 lento dejaba "Guardando tu registro..."
    // colgado indefinidamente.
    const res = await fetchConTimeout("/api/uploadFoto", { method: "POST", body: form }, 15000);
    const data = await res.json();

    return data.url || data.Url || data.URL || "";
  };

  const guardarIntentoFallido = async (fotoUrl) => {
    try {
      await fetchConTimeout("/api/guardarIntento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: cedula,
          fotoUrl,
          latitude: ubicacionRef.current.lat,
          longitude: ubicacionRef.current.lon,
          tipoMarcaje: tpMarca,
          enSede: dentroArea(ubicacionRef.current.lat, ubicacionRef.current.lon),
          rangodif: rangoRef.current,
          ubicacionMarcada: direccionActualRef.current,
        }),
      });
    } catch (e) {
      console.error("Error guardando intento fallido:", e);
    }
  };

  const fetchConTimeout = (url, opciones, ms = 15000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opciones, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  };

  const validarPersona = async (descriptor) => {
    // La cámara sigue encendida mientras se verifica. Solo el primer "no
    // coincide" la conserva para el reintento; cualquier otra salida (éxito,
    // segundo fallo, error o timeout) la apaga en el finally.
    let conservarCamara = false;
    try {
      if (!descriptor || descriptor.length === 0) {
        setMensaje2("ERROR: No se detectó el rostro. Intenta de nuevo.");
        return;
      }
      const id_usuario = cedula;
      const tipoMarcaje = tpMarca;

      if (!id_usuario || !tipoMarcaje) {
        setMensaje2("ERROR: Datos incompletos. Vuelve a intentarlo.");
        return;
      }

      const res = await fetchConTimeout("/api/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario,
          descriptor: Array.from(descriptor),
          latitude: ubicacionRef.current.lat,
          longitude: ubicacionRef.current.lon,
          enSede: dentroArea(ubicacionRef.current.lat, ubicacionRef.current.lon),
          rangodif: rangoRef.current,
          ubicacionMarcada: direccionActualRef.current,
          tipoMarcaje,
        }),
      });
      const data = await res.json();
      marcar("respuesta-servidor");

      if (data.ok) {
        if (data.coincide == 1) {
          stopCamera();
          setMensaje2(data.mensaje);
          marcar("confirmacion-mostrada");
          resumenMarcaje();
          router.push("/about");
        }
        // Respuesta sin campo "coincide" (p. ej. usuario sin registro
        // biométrico): antes ninguna rama corría y el spinner "Verificando
        // identidad..." quedaba pegado para siempre.
        if (data.coincide == null) {
          setMensaje2("ERROR: " + (data.mensaje || "No se pudo validar tu identidad. Intenta de nuevo."));
          setLoadingInit(true);
          return;
        }
        if (data.coincide == 0) {
          resumenMarcaje();
          intentosFallidosRef.current += 1;
          setLoadingInit(true);

          if (intentosFallidosRef.current >= 2) {
            stopCamera();
            intentosFallidosRef.current = 0;
            setRostroCoincide(true);
            setMensaje2("Guardando tu registro...");
            const blob = fotoBlobRef.current;
            try {
              // La foto es evidencia opcional: si su subida falla, el intento
              // se guarda igual en la base de datos (con URL vacía).
              let fotoUrl = "";
              if (blob) {
                try {
                  fotoUrl = await subirFotoS3(blob);
                } catch (e) {
                  console.error("No se pudo subir la foto, se guarda el intento sin ella:", e);
                }
              }
              await guardarIntentoFallido(fotoUrl);
              setMensaje2("Registro exitoso. No pudimos reconocerte pero tu registro quedó guardado.");
              setTimeout(() => router.push("/about"), 3500);
            } catch (e) {
              console.error("Error procesando foto de intento fallido:", e);
              setRostroCoincide(false);
              setMensaje2(data.mensaje);
              setTimeout(() => {
                reiniciarSistema();
                setLoadingInit(false);
              }, 5000);
            }
          } else {
            conservarCamara = true;
            setRostroCoincide(false);
            iniciarContador();
            setTimeout(() => {
              reiniciarSistema();
              setLoadingInit(false);
            }, 5000);
            setMensaje2(data.mensaje);
          }
        }
      } else {
        router.push("/error");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.name === "AbortError"
          ? "ERROR: El servidor tardó demasiado. Verifica tu conexión e intenta de nuevo."
          : "ERROR: Error al validar identidad. Intenta de nuevo.";
      setMensaje2(msg);
    } finally {
      if (!conservarCamara) stopCamera();
    }
  };

  useEffect(() => {
    if (!modelosCargados) return;
    // Nota: NO abortar si videoRef aún es null. Si las dependencias cambian
    // mientras la cámara está desmontada (pantalla de carga tras un fallo),
    // abortar aquí dejaba el sistema sin intervalo de detección para siempre.
    // El propio ciclo ya valida video/canvas en cada tick.

    // Ciclo autoprogramado en vez de setInterval(150): el siguiente tick se
    // agenda al terminar el actual, apuntando a la misma cadencia de 150 ms.
    // En equipos rápidos el ritmo es el mismo de antes; en equipos donde la
    // inferencia tarda más de 150 ms, setInterval descartaba el tick ocupado
    // y el ritmo real caía a 300 ms (el movimiento previo, que exige 15
    // muestras, tardaba el doble). Ahora el siguiente frame arranca enseguida.
    const CADENCIA_MS = 150;
    let activo = true;
    let timeoutId = null;
    const programar = (ms) => {
      if (activo) timeoutId = setTimeout(tick, ms);
    };

    const tick = async () => {
      if (!activo) return;
      // Un tick del ciclo anterior (antes de recrear el efecto) puede seguir
      // en curso: reintentar en breve en lugar de solaparse.
      if (isDetectingRef.current) {
        programar(30);
        return;
      }
      isDetectingRef.current = true;
      const inicioTick = performance.now();

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
        if (!canvas) return;

        // Solo pedir expresiones si el reto activo es "Sonreír" y su red ya
        // terminó de cargar (carga en segundo plano desde el inicio).
        const requiereExpresiones = validando && reto === "Sonreír" && !!faceapi.nets.faceExpressionNet.params;
        const deteccion = await obtenerDeteccionRapida(requiereExpresiones);
        if (!primeraInferenciaRef.current) {
          primeraInferenciaRef.current = true;
          marcar("primera-inferencia-video");
        }

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!deteccion) {
          setRostroPresente(false);
          faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });
          dibujarGuiaRostro(ctx, canvas.width, canvas.height);
          return;
        }

        setRostroPresente(true);
        if (!rostroMarcadoRef.current) {
          rostroMarcadoRef.current = true;
          marcar("rostro-detectado");
        }

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const resized = faceapi.resizeResults(deteccion, displaySize);
        const box = resized.detection.box;

        const estadoRecuadro = !validando ? "presente" : "validando";
        dibujarRecuadroRostro(ctx, box, estadoRecuadro);
        dibujarFeedbackDistancia(ctx, box, canvas.width, canvas.height);

        // Anti-spoofing: detectar movimiento real de cabeza
        if (!procesandoRef.current && !movimientoConfirmadoRef.current && !validando) {
          const nariz = deteccion.landmarks.getNose();
          const punta = nariz[3];
          histNarizRef.current.push({ x: punta.x, y: punta.y });
          if (histNarizRef.current.length > 25) histNarizRef.current.shift();

          if (histNarizRef.current.length >= 15) {
            const xs = histNarizRef.current.map((p) => p.x);
            const ys = histNarizRef.current.map((p) => p.y);
            const rangoX = Math.max(...xs) - Math.min(...xs);
            const rangoY = Math.max(...ys) - Math.min(...ys);
            const UMBRAL = box.width * 0.07;
            if (rangoX > UMBRAL || rangoY > UMBRAL) {
              movimientoConfirmadoRef.current = true;
              setMovimientoConfirmado(true);
              marcar("movimiento-confirmado");
              generarReto();
            }
          }
        }

        if (validando && !procesandoRef.current) {
          // Mismo umbral de siempre (happy > 0.7); el guard de expressions
          // solo evita leer un frame donde la red aún no había cargado.
          if (reto === "Sonreír" && deteccion.expressions && deteccion.expressions.happy > 0.7) {
            procesandoRef.current = true;
            setProcesando(true);
            dibujarRecuadroRostro(ctx, box, "cumplido");
            setValidando(false);
            if (timerRef.current) clearInterval(timerRef.current);
            marcar("gesto-cumplido");
            try {
              // Descriptor y foto en paralelo: ambos leen el mismo frame y no
              // dependen entre sí. Antes eran dos esperas secuenciales.
              const [finalSonrisa, fotoBlob] = await Promise.all([obtenerDescriptorFinal(), capturarFotoDesdeVideo()]);
              marcar("descriptor-y-foto-listos");
              fotoBlobRef.current = fotoBlob;
              // La cámara no se apaga aquí: validarPersona decide si se
              // conserva para el reintento o se apaga.
              setMensaje2("Verificando identidad...");
              setLoadingInit(true);
              if (finalSonrisa) {
                validarPersona(finalSonrisa.descriptor);
              } else {
                await stopCamera();
                procesandoRef.current = false;
                setProcesando(false);
                setMensaje2("ERROR: No se pudo capturar el rostro. Intenta de nuevo.");
              }
            } catch {
              procesandoRef.current = false;
              setProcesando(false);
              await stopCamera();
              setMensaje2("ERROR: Error al procesar el gesto. Intenta de nuevo.");
              setLoadingInit(true);
            }
          }

          if (reto === "Mover la cabeza") {
            const nose = deteccion.landmarks.getNose();
            const noseX = nose[3].x;
            const centerX = deteccion.detection.box.x + deteccion.detection.box.width / 2;
            const desplazamiento = noseX - centerX;
            const umbralGiro = deteccion.detection.box.width * 0.18;

            if (Math.abs(desplazamiento) > umbralGiro && !giroDetectado) {
              procesandoRef.current = true;
              setProcesando(true);
              dibujarRecuadroRostro(ctx, box, "cumplido");
              setGiroDetectado(true);
              setValidando(false);
              if (timerRef.current) clearInterval(timerRef.current);
              marcar("gesto-cumplido");
              try {
                const [finalGiro, fotoBlob] = await Promise.all([obtenerDescriptorFinal(), capturarFotoDesdeVideo()]);
                marcar("descriptor-y-foto-listos");
                fotoBlobRef.current = fotoBlob;
                // La cámara no se apaga aquí: validarPersona decide si se
                // conserva para el reintento o se apaga.
                setMensaje2("Verificando identidad...");
                setLoadingInit(true);
                if (finalGiro) {
                  validarPersona(finalGiro.descriptor);
                } else {
                  await stopCamera();
                  procesandoRef.current = false;
                  setProcesando(false);
                  setMensaje2("ERROR: No se pudo capturar el rostro. Intenta de nuevo.");
                }
              } catch {
                procesandoRef.current = false;
                setProcesando(false);
                await stopCamera();
                setMensaje2("ERROR: Error al procesar el gesto. Intenta de nuevo.");
                setLoadingInit(true);
              }
            }
          }
        }
      } finally {
        isDetectingRef.current = false;
        programar(Math.max(0, CADENCIA_MS - (performance.now() - inicioTick)));
      }
    };

    programar(0);

    return () => {
      activo = false;
      clearTimeout(timeoutId);
    };
    // Solo dependencias que el loop realmente lee. rostroPresente/parpadeos/
    // ojosCerrados solo se escriben aquí; tenerlas como deps destruía y
    // recreaba el intervalo en cada transición sin necesidad.
  }, [reto, modelosCargados, validando, giroDetectado]);

  const formatFechaHora = (isoString) => {
    const date = new Date(isoString);
    return {
      fecha: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      hora: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`,
    };
  };

  const filas = [];
  listado.forEach((u) => {
    u.asistencias?.forEach((a) => {
      const { fecha, hora } = formatFechaHora(a);
      filas.push({ nombre: u.nombre, fecha, hora });
    });
  });

  const jornadaHora = hora ? `${hora.toString().substring(0, 5)} ${parseInt(hora.toString().substring(0, 2)) < 12 ? "AM" : "PM"}` : "";

  // Ícono de cada tipo de registro. Los de cierre (fin, regreso) van en azul
  // oscuro para que cada par inicio–fin se distinga de un vistazo.
  const iconoMarcaje = (nombre = "") => {
    const n = nombre.toLowerCase();
    if (n.includes("almuerzo") || n.includes("lunch")) return Utensils;
    if (n.includes("descanso") || n.includes("pausa")) return Coffee;
    if (n.includes("capacit")) return GraduationCap;
    if (n.includes("baño") || n.includes("bano")) return n.includes("regreso") ? DoorClosed : DoorOpen;
    if (n.includes("permiso")) return ClipboardList;
    if (n.includes("fin") || n.includes("salida")) return LogOut;
    if (n.includes("inicio") || n.includes("ingreso") || n.includes("entrada")) return LogIn;
    return Fingerprint;
  };
  const esCierre = (nombre = "") => /^(fin|regreso)\b/i.test(nombre.trim()) || /^salida$/i.test(nombre.trim());

  // Algunos mensajes de estado traen un emoji al inicio ("📡 …"); la interfaz
  // los muestra sin él.
  const sinEmoji = (texto = "") => texto.replace(/^[^\p{L}\p{N}¡¿]+/u, "");

  const volverAlInicio = () => {
    setIniciarProceso(false);
    setLoadingInit(true);
    setMensaje2("");
  };

  const PASOS_RETO = {
    "Mover la cabeza": {
      titulo: "Gira la cabeza de un lado a otro",
      pasos: ["Mira hacia tu izquierda lentamente", "Luego mira hacia tu derecha"],
      consejo: "Mantén tu rostro visible frente a la cámara",
    },
    Sonreír: {
      titulo: "Sonríe a la cámara",
      pasos: ["Mira directo a la cámara", "Haz una sonrisa amplia y natural"],
      consejo: "Mantén la sonrisa uno o dos segundos",
    },
  };

  return (
    <div className="sg-app">
      <Cabecera />

      {/* ── PANTALLA INICIO ─────────────────────────────────────────────── */}
      {!iniciarProceso && (
        <main className="sg-cuerpo">
          <section className="sg-panel">
            <h1 className="sg-titulo">Registro de asistencia</h1>
            <p className="sg-sub">Ingresa tu cédula y elige el tipo de registro.</p>

            <label className="sg-etiqueta" htmlFor="cedula">
              Número de cédula
            </label>
            <div className={`sg-campo${errorCedula ? " sg-con-error" : ""}`}>
              <IdCard size={18} className="sg-campo-ico" aria-hidden="true" />
              <input
                id="cedula"
                className="sg-input"
                type="number"
                inputMode="numeric"
                placeholder="Ej: 1234567890"
                value={cedula}
                aria-invalid={!!errorCedula}
                onChange={(e) => {
                  setCedula(e.target.value);
                  setErrorCedula("");
                }}
              />
            </div>
            {errorCedula && (
              <p className="sg-msj-error" role="alert">
                <TriangleAlert size={14} aria-hidden="true" /> {errorCedula}
              </p>
            )}

            <span className="sg-etiqueta">Tipo de registro</span>
            {loadingTipos ? (
              <div className="sg-opciones" aria-busy="true" aria-label="Cargando tipos de registro">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="sg-esqueleto" />
                ))}
              </div>
            ) : (
              <div className={`sg-opciones${tipoSMarcaje.length > 2 ? "" : " sg-una-columna"}`}>
                {tipoSMarcaje.map((op, i) => {
                  const Icono = iconoMarcaje(op.Nombre);
                  return (
                    <button key={i} type="button" className="sg-opcion" style={{ "--i": i }} onClick={() => handleStart(op)}>
                      <span className={`sg-opcion-ico${esCierre(op.Nombre) ? " sg-cierre" : ""}`}>
                        <Icono size={19} aria-hidden="true" />
                      </span>
                      <span className="sg-opcion-txt">{op.Nombre}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <p className="sg-nota">
            <ShieldCheck size={15} aria-hidden="true" /> Al continuar se activará la cámara para verificar tu identidad.
          </p>
        </main>
      )}

      {/* ── ESTADOS: cargando, error, no reconocido ─────────────────────── */}
      {iniciarProceso && loadingInit && (
        <main className="sg-cuerpo">
          <section className="sg-panel sg-estado" aria-live="polite">
            {!rostroCoincide ? (
              <>
                <div className="sg-estado-ico sg-peligro">
                  <ScanFace size={34} aria-hidden="true" />
                </div>
                <h1 className="sg-titulo">Rostro no reconocido</h1>
                <p className="sg-sub">{sinEmoji(mensaje2)}</p>
                {/* el reintento ocurre a los 5 s (setTimeout en validarPersona) */}
                <div className="sg-barra sg-temporizada" style={{ "--dur": "5s" }}>
                  <span />
                </div>
                <p className="sg-nota" style={{ marginTop: 10 }}>
                  Preparando un nuevo intento…
                </p>
              </>
            ) : mensaje2?.startsWith("ERROR:") ? (
              <>
                <div className="sg-estado-ico sg-alerta">
                  <TriangleAlert size={32} aria-hidden="true" />
                </div>
                <h1 className="sg-titulo">No pudimos continuar</h1>
                <p className="sg-sub">{mensaje2.replace("ERROR: ", "")}</p>
                <button type="button" className="sg-boton" onClick={volverAlInicio}>
                  <RotateCcw size={17} aria-hidden="true" /> Volver a intentar
                </button>
              </>
            ) : mensaje2?.startsWith("Registro exitoso") ? (
              <>
                <div className="sg-estado-ico sg-info">
                  <BadgeCheck size={34} aria-hidden="true" />
                </div>
                <h1 className="sg-titulo">Registro guardado</h1>
                <p className="sg-sub">{mensaje2}</p>
              </>
            ) : (
              <>
                <div className="sg-estado-ico sg-info sg-cargando">
                  <Fingerprint size={32} aria-hidden="true" />
                </div>
                <h1 className="sg-titulo">Un momento</h1>
                <p className="sg-sub">{sinEmoji(mensaje2) || "Cargando…"}</p>
              </>
            )}
          </section>
        </main>
      )}

      {/* ── CÁMARA ACTIVA ───────────────────────────────────────────────── */}
      {iniciarProceso && !loadingInit && (
        <main className="sg-cuerpo">
          <section className="sg-panel sg-panel-compacto">
            <div className="sg-info">
              <div className="sg-dato">
                <span className="sg-dato-ico">
                  <Building2 size={17} aria-hidden="true" />
                </span>
                <span>
                  <small>Lugar de trabajo</small>
                  <strong>{direccion || "—"}</strong>
                </span>
              </div>
              <div className="sg-dato">
                <span className="sg-dato-ico">
                  <Clock size={17} aria-hidden="true" />
                </span>
                <span>
                  <small>Inicio de jornada</small>
                  <strong>{jornadaHora || "—"}</strong>
                </span>
              </div>
            </div>
          </section>

          <section className="sg-panel sg-panel-compacto">
            {contador > 0 && (
              <div className={`sg-tiempo${contador <= 3 ? " sg-urgente" : ""}`}>
                <div className="sg-tiempo-fila">
                  <span>Tiempo para el gesto</span>
                  <span className="sg-tiempo-seg">{contador}s</span>
                </div>
                <div className={`sg-barra${contador <= 3 ? " sg-urgente" : ""}`}>
                  <span style={{ width: `${(contador / 10) * 100}%` }} />
                </div>
              </div>
            )}

            <div className="sg-video">
              <video ref={videoRef} autoPlay muted playsInline />
              <canvas ref={canvasRef} />
              {!modelosCargados && (
                <div className="sg-video-cargando">
                  <div className="sg-giro" />
                  Preparando reconocimiento facial…
                </div>
              )}
              {procesando && (
                <div className="sg-video-cargando" style={{ zIndex: 10 }}>
                  <div className="sg-giro" />
                  <span>
                    Gesto detectado ✓
                    <small style={{ display: "block", marginTop: 4, fontWeight: 400, opacity: 0.75 }}>Verificando identidad…</small>
                  </span>
                </div>
              )}
            </div>

            <div className={`sg-zona ${estaDentroArea ? "sg-dentro" : "sg-fuera"}`}>
              <MapPin size={18} aria-hidden="true" style={{ flex: "none", marginTop: 1 }} />
              <span>
                <strong>{estaDentroArea ? "Dentro de tu zona de trabajo" : "Fuera de tu zona de trabajo"}</strong>
                {direccionActual && <small>{direccionActual}</small>}
              </span>
            </div>
          </section>

          <section className="sg-panel sg-panel-compacto" aria-live="polite">
            {!rostroPresente ? (
              <div className="sg-paso">
                <span className="sg-paso-ico sg-neutro">
                  <Crosshair size={22} aria-hidden="true" />
                </span>
                <span className="sg-paso-txt">
                  <strong>Ubícate frente a la cámara</strong>
                  <small>Centra tu rostro dentro del óvalo.</small>
                </span>
              </div>
            ) : !movimientoConfirmado && !reto ? (
              <>
                <div className="sg-paso">
                  <span className="sg-paso-ico">
                    <ScanFace size={24} className="sg-anima-cabeza" aria-hidden="true" />
                  </span>
                  <span className="sg-paso-txt">
                    <strong>Mueve ligeramente la cabeza</strong>
                    <small>Así confirmamos que eres una persona real.</small>
                  </span>
                </div>
                {mensaje && (
                  <p className="sg-aviso">
                    <Timer size={15} aria-hidden="true" /> {sinEmoji(mensaje)}
                  </p>
                )}
              </>
            ) : reto && !validando ? (
              // Gesto cumplido: el video sigue a la vista mientras se verifica.
              <div className="sg-paso">
                <span className="sg-paso-ico sg-ok">
                  <CircleCheck size={24} aria-hidden="true" />
                </span>
                <span className="sg-paso-txt">
                  <strong>Gesto detectado</strong>
                  <small>Verificando tu identidad…</small>
                </span>
              </div>
            ) : reto ? (
              <>
                <div className="sg-paso">
                  <span className="sg-paso-ico">
                    {reto === "Mover la cabeza" ? (
                      <ArrowLeftRight size={24} className="sg-anima-cabeza" aria-hidden="true" />
                    ) : (
                      <Smile size={24} className="sg-anima-latido" aria-hidden="true" />
                    )}
                  </span>
                  <span className="sg-paso-txt">
                    <small className="sg-ceja">Gesto solicitado</small>
                    <strong>{PASOS_RETO[reto]?.titulo || reto}</strong>
                  </span>
                </div>
                {PASOS_RETO[reto] && (
                  <ol className="sg-pasos">
                    {PASOS_RETO[reto].pasos.map((paso, i) => (
                      <li key={paso}>
                        <span className="sg-pasos-num">{i + 1}</span>
                        {paso}
                      </li>
                    ))}
                    <li className="sg-consejo">
                      <span className="sg-pasos-num">
                        <Lightbulb size={12} aria-hidden="true" />
                      </span>
                      {PASOS_RETO[reto].consejo}
                    </li>
                  </ol>
                )}
                {mensaje && (
                  <p className="sg-aviso">
                    <Timer size={15} aria-hidden="true" /> {sinEmoji(mensaje)}
                  </p>
                )}
              </>
            ) : (
              <div className="sg-paso">
                <span className="sg-paso-ico">
                  <Sparkles size={22} className="sg-anima-latido" aria-hidden="true" />
                </span>
                <span className="sg-paso-txt">
                  <strong>Rostro detectado</strong>
                  <small>Preparando tu gesto…</small>
                </span>
              </div>
            )}
          </section>
        </main>
      )}

      <Pie />
    </div>
  );
}
