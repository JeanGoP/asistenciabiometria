"use client";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

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

// Encabezado de marca: mismo azul y franjas diagonales que el encabezado del
// login de Síntesis Gestión en celular (.lg-cab-movil).
export function Cabecera({ modulo = "Control biométrico", mostrarFecha = true }) {
  const fechaHora = useFechaHora();
  const version = process.env.NEXT_PUBLIC_VERSION;

  return (
    <header className="sg-cab">
      <svg className="sg-cab-franjas" viewBox="0 0 200 150" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <polygon points="90,0 120,0 60,150 30,150" fill="#0074bc" />
        <polygon points="135,0 150,0 90,150 75,150" fill="#188ce3" />
        <polygon points="165,0 200,0 200,150 105,150" fill="#00467a" />
      </svg>

      <div className="sg-cab-fila">
        <div className="sg-marca">
          <span className="sg-marca-logo">
            <img src="/images/sintesis-logo.png" alt="" />
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
