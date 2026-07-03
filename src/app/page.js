"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./indexPrincipal.css";
import * as faceapi from "face-api.js";
import { cargarModelos, cargarExpresiones } from "@/lib/faceModels";
import { marcar, resumenMarcaje, limpiarMarcas } from "@/lib/perf";
import { useAppContext } from "@/context/AppContext";
import {
  ScanFace,
  User,
  MapPin,
  Clock,
  TriangleAlert,
  Smile,
  ArrowLeftRight,
  Crosshair,
  LogIn,
  LogOut,
  Utensils,
  ClipboardList,
  CircleDot,
  CheckCircle2,
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
  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
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
    return () => window.removeEventListener("resize", handleResize);
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
    // Permiso de cámara y carga de modelos en paralelo. Si los modelos ya se
    // precargaron al montar la página, cargarModelos() resuelve al instante.
    const [stream] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      }),
      cargarModelos(),
    ]);
    // Asignación con reintento: en el reinicio tras un intento fallido, el
    // stream puede resolver antes de que React re-monte el <video>. El viejo
    // `if (videoRef.current)` descartaba el stream y la cámara quedaba muerta.
    asignarStreamAlVideo(stream);
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
  const obtenerDeteccionRapida = async (conExpresiones) => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 });
    const tarea = faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks();
    if (conExpresiones) return (await tarea.withFaceExpressions()) || null;
    return (await tarea) || null;
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
          setMensaje("⏱️ Tiempo agotado, intenta de nuevo");
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
          stopCamera();
          setLoadingInit(true);

          if (intentosFallidosRef.current >= 2) {
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
    }
  };

  useEffect(() => {
    if (!modelosCargados) return;
    // Nota: NO abortar si videoRef aún es null. Si las dependencias cambian
    // mientras la cámara está desmontada (pantalla de carga tras un fallo),
    // abortar aquí dejaba el sistema sin intervalo de detección para siempre.
    // El propio intervalo ya valida video/canvas en cada tick.

    let intervalo = setInterval(async () => {
      if (isDetectingRef.current) return;
      isDetectingRef.current = true;

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

        const ratio = box.width / canvas.width;
        const distanciaOk = ratio >= 0.2 && ratio <= 0.6;

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
              await stopCamera();
              setMensaje2("Verificando identidad...");
              setLoadingInit(true);
              if (finalSonrisa) {
                validarPersona(finalSonrisa.descriptor);
              } else {
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
                await stopCamera();
                setMensaje2("Verificando identidad...");
                setLoadingInit(true);
                if (finalGiro) {
                  validarPersona(finalGiro.descriptor);
                } else {
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
      }
    }, 150);

    return () => clearInterval(intervalo);
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

  const horaActual = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const fechaActual = capitalize(new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  const jornadaHora = hora ? `${hora.toString().substring(0, 5)} ${parseInt(hora.toString().substring(0, 2)) < 12 ? "AM" : "PM"}` : "";

  const iconoMarcaje = (nombre = "") => {
    const n = nombre.toLowerCase();
    if (n.includes("ingreso") || n.includes("entrada")) return <LogIn size={22} color="#16a34a" />;
    if (n.includes("salida")) return <LogOut size={22} color="#dc2626" />;
    if (n.includes("almuerzo") || n.includes("lunch")) return <Utensils size={22} color="#d97706" />;
    if (n.includes("permiso")) return <ClipboardList size={22} color="#7c3aed" />;
    return <CircleDot size={22} color="#2563eb" />;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8" }}>
      {/* ── PANTALLA INICIO ─────────────────────────────────────────────── */}
      {!iniciarProceso && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#0f7cc0,#1a9fd4)", padding: "28px 24px 36px", color: "#fff" }}>
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <ScanFace size={34} color="#fff" />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>CONTROL BIOMÉTRICO</h1>
                    <span
                      style={{ fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 7px", letterSpacing: 0.5 }}
                    >
                      v{process.env.NEXT_PUBLIC_VERSION}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
                    {fechaActual} · {horaActual}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div style={{ flex: 1, maxWidth: 480, margin: "0 auto", width: "100%", padding: "0 16px 32px", marginTop: -16 }}>
            {/* Card principal */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", marginBottom: 16 }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>NÚMERO DE CÉDULA</p>
              <div style={{ position: "relative", marginBottom: 24 }}>
                <User size={18} color="#9ca3af" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej: 1234567890"
                  value={cedula}
                  onChange={(e) => {
                    setCedula(e.target.value);
                    setErrorCedula("");
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: 12,
                    fontSize: 16,
                    border: "2px solid #e5e7eb",
                    outline: "none",
                    boxSizing: "border-box",
                    color: "#111827",
                    background: "#f9fafb",
                    fontWeight: 600,
                    border: `2px solid ${errorCedula ? "#ef4444" : "#e5e7eb"}`,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = errorCedula ? "#ef4444" : "#0f7cc0")}
                  onBlur={(e) => (e.target.style.borderColor = errorCedula ? "#ef4444" : "#e5e7eb")}
                />
                {errorCedula && (
                  <p style={{ margin: "6px 0 0 4px", fontSize: 13, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <TriangleAlert size={14} /> {errorCedula}
                  </p>
                )}
              </div>

              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>TIPO DE REGISTRO</p>

              {loadingTipos ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                  <div className="spinner" />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: tipoSMarcaje.length > 2 ? "1fr 1fr" : "1fr", gap: 10 }}>
                  {tipoSMarcaje.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => handleStart(op)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "16px 18px",
                        borderRadius: 14,
                        border: "2px solid #e5e7eb",
                        background: "#f9fafb",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                        width: "100%",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#0f7cc0";
                        e.currentTarget.style.background = "#eff6ff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.background = "#f9fafb";
                      }}
                    >
                      {iconoMarcaje(op.Nombre)}
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{op.Nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af" }}>Al continuar se activará la cámara para verificar tu identidad</p>
          </div>
        </div>
      )}

      {/* ── LOADING ─────────────────────────────────────────────────────── */}
      {iniciarProceso && loadingInit && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f0f4f8",
            padding: 24,
          }}
        >
          {rostroCoincide ? (
            <div style={{ textAlign: "center", maxWidth: 320 }}>
              {mensaje2?.startsWith("ERROR:") ? (
                <>
                  <TriangleAlert size={52} color="#f59e0b" style={{ marginBottom: 16 }} />
                  <p
                    style={{
                      color: "#92400e",
                      fontSize: 15,
                      fontWeight: 700,
                      margin: "0 0 20px",
                      background: "#fef3c7",
                      padding: "12px 16px",
                      borderRadius: 12,
                    }}
                  >
                    {mensaje2.replace("ERROR: ", "")}
                  </p>
                  <button
                    onClick={() => {
                      setIniciarProceso(false);
                      setLoadingInit(true);
                      setMensaje2("");
                    }}
                    style={{
                      padding: "12px 28px",
                      borderRadius: 12,
                      border: "none",
                      background: "#0f7cc0",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                  >
                    Volver a intentar
                  </button>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      border: "6px solid #e5e7eb",
                      borderTop: "6px solid #0f7cc0",
                      animation: "spin 0.9s linear infinite",
                      margin: "0 auto 24px",
                    }}
                  />
                  <p style={{ color: "#374151", fontSize: 15, fontWeight: 600, margin: 0 }}>{mensaje2 || "Cargando..."}</p>
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", maxWidth: 340 }}>
              <img src="./images/found.gif" style={{ width: 160, marginBottom: 20 }} alt="" />
              <div style={{ background: "#fee2e2", borderRadius: 16, padding: "16px 20px" }}>
                <p style={{ color: "#991b1b", fontWeight: 700, fontSize: 15, margin: "0 0 8px" }}>Rostro no reconocido</p>
                <p style={{ color: "#7f1d1d", fontSize: 13, margin: 0 }}>{mensaje2}</p>
              </div>
              {contador > 0 && (
                <p style={{ marginTop: 16, color: "#6b7280", fontSize: 13 }}>
                  Reintentando en <strong>{contador}s</strong>...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CÁMARA ACTIVA ───────────────────────────────────────────────── */}
      {iniciarProceso && !loadingInit && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f0f4f8" }}>
          {/* Header con fecha/lugar/jornada */}
          <div style={{ background: "linear-gradient(135deg,#0f7cc0,#1a9fd4)", padding: "14px 20px 18px", color: "#fff" }}>
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              {/* Fila superior: fecha y hora */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5 }}>{fechaActual}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 800 }}>{horaActual}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>LUGAR DE TRABAJO</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, maxWidth: 180 }}>{direccion || "—"}</p>
                </div>
              </div>
              {/* Fila inferior: inicio de jornada */}
              {jornadaHora && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "7px 12px" }}>
                  <Clock size={16} color="#fff" />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                    Inicio de jornada: <strong>{jornadaHora}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cuerpo */}
          <div style={{ flex: 1, maxWidth: 480, margin: "0 auto", width: "100%", padding: "16px 16px 32px" }}>
            {/* Contador — encima del video */}
            {contador > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Tiempo restante</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: contador <= 3 ? "#ef4444" : "#0f7cc0" }}>{contador}s</span>
                </div>
                <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 99,
                      transition: "width 0.8s ease",
                      background: contador <= 3 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#0f7cc0,#00e5ff)",
                      width: `${(contador / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Video */}
            <div
              style={{
                position: "relative",
                borderRadius: 20,
                overflow: "hidden",
                background: "#000",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                marginBottom: 16,
                aspectRatio: "4/3",
              }}
            >
              <video ref={videoRef} autoPlay muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 20 }} />
              {!modelosCargados && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 20,
                    gap: 14,
                    zIndex: 5,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      border: "4px solid rgba(255,255,255,0.25)",
                      borderTop: "4px solid #fff",
                      borderRadius: "50%",
                      animation: "spin 0.9s linear infinite",
                    }}
                  />
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0, textAlign: "center", padding: "0 20px" }}>
                    Preparando reconocimiento facial...
                  </p>
                </div>
              )}
              {procesando && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.72)",
                    borderRadius: 20,
                    gap: 16,
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      border: "5px solid rgba(255,255,255,0.2)",
                      borderTop: "5px solid #00e5ff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <div style={{ textAlign: "center", padding: "0 24px" }}>
                    <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Gesto detectado ✓</p>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>Verificando identidad...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Zona de trabajo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                borderRadius: 14,
                background: estaDentroArea ? "#d1fae5" : "#fee2e2",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                marginBottom: 10,
              }}
            >
              <MapPin size={20} color={estaDentroArea ? "#065f46" : "#991b1b"} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: estaDentroArea ? "#065f46" : "#991b1b" }}>
                  {estaDentroArea ? "Dentro de tu zona de trabajo" : "Fuera de tu zona de trabajo"}
                </p>
                {direccionActual && (
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: estaDentroArea ? "#047857" : "#b91c1c", lineHeight: 1.3 }}>{direccionActual}</p>
                )}
              </div>
            </div>

            {/* Reto */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
              {!rostroPresente ? (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <p style={{ margin: 0, fontSize: 15, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Crosshair size={18} color="#9ca3af" /> Ubícate frente a la cámara
                  </p>
                </div>
              ) : !movimientoConfirmado && !reto ? (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ fontSize: 36, animation: "headTurnLeft 1.2s ease-in-out infinite alternate", display: "inline-block", marginBottom: 8 }}>
                    🙂
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#374151" }}>Mueve ligeramente la cabeza</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Confirma que eres una persona real</p>
                </div>
              ) : reto ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Realiza el siguiente gesto
                  </p>
                  <div
                    style={{
                      background: "linear-gradient(135deg,#0f7cc0,#1a9fd4)",
                      borderRadius: 16,
                      padding: "18px 24px",
                      textAlign: "center",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      {reto === "Mover la cabeza" ? <ArrowLeftRight size={28} color="#fff" /> : <Smile size={28} color="#fff" />}
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                        {reto === "Mover la cabeza" ? "Mover lentamente la cabeza de un lado a otro" : "Sonríe a la cámara"}
                      </span>
                    </div>
                  </div>
                  {/* Ejemplo visual del reto */}
                  <div style={{ width: "100%", boxSizing: "border-box" }}>
                    {reto === "Mover la cabeza" ? (
                      <div style={{ background: "#eff6ff", borderRadius: 12, padding: "12px 14px", border: "1px solid #bfdbfe" }}>
                        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 0.6 }}>
                          ¿Cómo hacerlo?
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div
                              style={{
                                fontSize: 28,
                                animation: "headTurnLeft 1.5s ease-in-out infinite alternate",
                                display: "inline-block",
                              }}
                            >
                              😐
                            </div>
                            <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>IZQUIERDA</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, opacity: 0.4 }}>
                            <ArrowLeftRight size={20} color="#3b82f6" />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div
                              style={{
                                fontSize: 28,
                                animation: "headTurnRight 1.5s ease-in-out infinite alternate",
                                display: "inline-block",
                              }}
                            >
                              😐
                            </div>
                            <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>DERECHA</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#dbeafe", borderRadius: 8, padding: "5px 8px" }}>
                            <span style={{ fontSize: 14 }}>1️⃣</span>
                            <span style={{ fontSize: 11, color: "#1e40af" }}>
                              Mira hacia tu <strong>izquierda</strong> lentamente
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#dbeafe", borderRadius: 8, padding: "5px 8px" }}>
                            <span style={{ fontSize: 14 }}>2️⃣</span>
                            <span style={{ fontSize: 11, color: "#1e40af" }}>
                              Luego mira hacia tu <strong>derecha</strong> lentamente
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#dbeafe", borderRadius: 8, padding: "5px 8px" }}>
                            <span style={{ fontSize: 14 }}>💡</span>
                            <span style={{ fontSize: 11, color: "#1e40af" }}>Mantén tu rostro visible frente a la cámara</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 14px", border: "1px solid #bbf7d0" }}>
                        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.6 }}>
                          ¿Cómo hacerlo?
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 28 }}>😐</span>
                            <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>NEUTRO</span>
                          </div>
                          <span style={{ fontSize: 18, color: "#16a34a" }}>→</span>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <span
                              style={{
                                fontSize: 28,
                                animation: "smilePulse 1.2s ease-in-out infinite alternate",
                                display: "inline-block",
                              }}
                            >
                              😁
                            </span>
                            <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>SONRÍE</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#dcfce7", borderRadius: 8, padding: "5px 8px" }}>
                            <span style={{ fontSize: 14 }}>1️⃣</span>
                            <span style={{ fontSize: 11, color: "#166534" }}>Mira directo a la cámara</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#dcfce7", borderRadius: 8, padding: "5px 8px" }}>
                            <span style={{ fontSize: 14 }}>2️⃣</span>
                            <span style={{ fontSize: 11, color: "#166534" }}>
                              Haz una <strong>sonrisa amplia</strong> y natural
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#dcfce7", borderRadius: 8, padding: "5px 8px" }}>
                            <span style={{ fontSize: 14 }}>💡</span>
                            <span style={{ fontSize: 11, color: "#166534" }}>Mantén la sonrisa por 1-2 segundos</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {mensaje && (
                    <div style={{ background: "#d1fae5", borderRadius: 10, padding: "9px 14px", width: "100%", boxSizing: "border-box" }}>
                      <p style={{ margin: 0, color: "#065f46", fontWeight: 700, fontSize: 13, textAlign: "center" }}>{mensaje}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#0f7cc0", fontWeight: 600 }}>Rostro detectado, preparando reto...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
