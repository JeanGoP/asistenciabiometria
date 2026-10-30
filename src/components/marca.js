"use client";
import { useEffect, useId, useState } from "react";
import { CalendarDays } from "lucide-react";
import { AccesorioLogo, AdornoFestivo, ParticulasFestivas, SaludoFestivo, useTemaFestivo } from "./festivo";

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Fecha y hora calculadas en el navegador: las páginas se prerenderizan en el
// build y una fecha calculada en el servidor quedaría congelada.
function useFechaHora() {
  const [ahora, setAhora] = useState(null);
  useEffect(() => {
    setAhora(new Date());
    const id = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  if (!ahora) return null;
  return {
    fecha: capitalizar(ahora.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })),
    hora: ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
  };
}

// Isotipo de la app: capas isométricas con el rayo. El id del degradado es
// único por instancia (useId sin caracteres especiales, válido en url(#…)).
export function LogoIsotipo({ size = 30 }) {
  const degradado = `logo-cara-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="logo-isotipo app-brand-mark"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={degradado} x1="8" y1="10" x2="56" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#1976d2" />
        </linearGradient>
      </defs>
      <path d="M32 33 L56 45 L32 57 L8 45 Z" fill="#3d5afe" />
      <path d="M32 21.5 L56 33.5 L32 45.5 L8 33.5 Z" fill="#b9dcff" />
      <path d="M32 10 L56 22 L32 34 L8 22 Z" fill={`url(#${degradado})`} />
      <path d="M35.4 14.6 L24.6 23.2 L30.4 23.6 L28.6 29.8 L39.4 21.2 L33.6 20.8 Z" fill="#ffffff" />
    </svg>
  );
}

// Encabezado de marca: mismo azul y franjas diagonales que el encabezado del
// login de Síntesis Gestión en celular (.lg-cab-movil). En fechas especiales
// (festivo.js) se decora; `animado={false}` apaga las partículas, p. ej.
// mientras la cámara está activa, para no competir con el reconocimiento.
export function Cabecera({ modulo = "Control biométrico", mostrarFecha = true, animado = true }) {
  const fechaHora = useFechaHora();
  const tema = useTemaFestivo();
  const version = process.env.NEXT_PUBLIC_VERSION;

  return (
    <header className={`sg-cab${tema?.adorno === "luces" ? " sg-cab-con-luces" : ""}`} data-tema={tema?.id}>
      <svg className="sg-cab-franjas" viewBox="0 0 200 150" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <polygon className="sg-franja-1" points="90,0 120,0 60,150 30,150" fill="#0074bc" />
        <polygon className="sg-franja-2" points="135,0 150,0 90,150 75,150" fill="#188ce3" />
        <polygon className="sg-franja-3" points="165,0 200,0 200,150 105,150" fill="#00467a" />
      </svg>
      {tema && animado && <ParticulasFestivas tipo={tema.particulas} />}
      {tema?.adorno && <AdornoFestivo tipo={tema.adorno} />}

      <div className="sg-cab-fila">
        <div className="sg-marca">
          <span className="sg-marca-logo-wrap">
            <span className="sg-marca-logo">
              <LogoIsotipo size={32} />
            </span>
            {tema && <AccesorioLogo tipo={tema.accesorio} />}
          </span>
          <span>
            <span className="sg-marca-nombre">Síntesis Gestión</span>
            <span className="sg-marca-modulo">{modulo}</span>
          </span>
        </div>
        {version && <span className="sg-version">v{version}</span>}
      </div>

      {mostrarFecha && (
        <div className="sg-cab-fecha">
          {fechaHora && (
            <>
              <CalendarDays size={15} aria-hidden="true" />
              <span>
                {fechaHora.fecha} · <strong>{fechaHora.hora}</strong>
              </span>
            </>
          )}
        </div>
      )}

      {tema && (
        <div className="sg-cab-extra">
          <SaludoFestivo tema={tema} />
        </div>
      )}
    </header>
  );
}

export function Pie() {
  return (
    <footer className="sg-pie" suppressHydrationWarning>
      &copy; Sidecil Cloud 2022 - {new Date().getFullYear()}
    </footer>
  );
}
