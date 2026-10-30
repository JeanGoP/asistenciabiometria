"use client";
import { useEffect, useState } from "react";
import { Flag, Flame, Ghost, Gift, Heart, PartyPopper, Snowflake, TreePine } from "lucide-react";

// Temporadas festivas: en fechas especiales el encabezado se decora (accesorio
// sobre el logo, saludo, colores de las franjas y partículas animadas) y la
// confirmación del marcaje agrega un mensaje alusivo. Nada de esto se dibuja
// sobre la cámara ni sobre el rostro.
//
// Para ver una temporada sin esperar la fecha se agrega ?tema=<id> a la URL
// (halloween, diciembre, velitas, novena, navidad, anionuevo, amistad,
// independencia); se recuerda durante la pestaña. ?tema=ninguno lo desactiva.

// Del segundo semestre en adelante se saluda el año que viene (30-31 dic, o una
// vista previa con ?tema); del 1 al 6 de enero, el año en curso.
const anioNuevo = (f) => (f.getMonth() >= 6 ? f.getFullYear() + 1 : f.getFullYear());

// Se evalúan en orden: las fechas puntuales de diciembre van antes que el mes completo.
export const TEMPORADAS = [
  {
    id: "halloween",
    desde: [10, 24],
    hasta: [10, 31],
    saludo: "¡Feliz Halloween!",
    despedida: "Que tengas una jornada de miedo… ¡pero muy productiva!",
    icono: Ghost,
    accesorio: "calabaza",
    particulas: "murcielagos",
    adorno: "telarana",
  },
  {
    id: "velitas",
    desde: [12, 7],
    hasta: [12, 8],
    saludo: "¡Feliz Día de las Velitas!",
    despedida: "Que la luz de estas fechas ilumine tu jornada.",
    icono: Flame,
    accesorio: "gorro",
    particulas: "chispas",
    adorno: "luces",
  },
  {
    id: "novena",
    desde: [12, 16],
    hasta: [12, 23],
    saludo: "¡Feliz novena de aguinaldos!",
    despedida: "Que estas fechas estén llenas de buenos momentos.",
    icono: Gift,
    accesorio: "gorro",
    particulas: "nieve",
    adorno: "luces",
  },
  {
    id: "navidad",
    desde: [12, 24],
    hasta: [12, 25],
    saludo: "¡Feliz Navidad!",
    despedida: "Te deseamos una feliz Navidad junto a los tuyos.",
    icono: TreePine,
    accesorio: "gorro",
    particulas: "nieve",
    adorno: "luces",
  },
  {
    id: "anionuevo",
    desde: [12, 30],
    hasta: [1, 6],
    saludo: (f) => `¡Feliz Año Nuevo ${anioNuevo(f)}!`,
    despedida: (f) => `Que el ${anioNuevo(f)} venga lleno de logros.`,
    icono: PartyPopper,
    accesorio: "fiesta",
    particulas: "confeti",
  },
  {
    id: "diciembre",
    desde: [12, 1],
    hasta: [12, 29],
    saludo: "¡Felices fiestas!",
    despedida: "Disfruta la temporada más bonita del año.",
    icono: Snowflake,
    accesorio: "gorro",
    particulas: "nieve",
    adorno: "luces",
  },
  {
    id: "amistad",
    desde: [9, 1],
    hasta: [9, 30],
    saludo: "¡Feliz mes del amor y la amistad!",
    despedida: "Gracias por ser parte de este equipo.",
    icono: Heart,
    accesorio: "corazon",
    particulas: "corazones",
  },
  {
    id: "independencia",
    desde: [7, 19],
    hasta: [7, 20],
    saludo: "¡Feliz Día de la Independencia!",
    despedida: "¡Viva Colombia!",
    icono: Flag,
    accesorio: "bandera",
    particulas: "tricolor",
  },
];

// [mes, día]: rangos que cruzan el año (30 dic → 6 ene) también funcionan.
const enRango = (f, [m1, d1], [m2, d2]) => {
  const v = (f.getMonth() + 1) * 100 + f.getDate();
  const a = m1 * 100 + d1;
  const b = m2 * 100 + d2;
  return a <= b ? v >= a && v <= b : v >= a || v <= b;
};

export function temaFestivo(fecha = new Date(), forzado = null) {
  if (forzado === "ninguno") return null;
  const t = forzado ? TEMPORADAS.find((x) => x.id === forzado) : TEMPORADAS.find((x) => enRango(fecha, x.desde, x.hasta));
  if (!t) return null;
  const texto = (v) => (typeof v === "function" ? v(fecha) : v);
  return { ...t, saludo: texto(t.saludo), despedida: texto(t.despedida) };
}

// Se calcula en el navegador (las páginas se prerenderizan en el build).
export function useTemaFestivo() {
  const [tema, setTema] = useState(null);
  useEffect(() => {
    let forzado = null;
    try {
      forzado = new URLSearchParams(window.location.search).get("tema");
      if (forzado) sessionStorage.setItem("sg-tema", forzado);
      else forzado = sessionStorage.getItem("sg-tema");
    } catch {
      // sin sessionStorage (modo privado, iframe restringido): solo la URL
    }
    setTema(temaFestivo(new Date(), forzado));
  }, []);
  return tema;
}

// ── Accesorios sobre el logo ────────────────────────────────────────────────

const ACCESORIOS = {
  calabaza: (
    <svg viewBox="0 0 32 30" width="26" height="24" aria-hidden="true">
      <path d="M16 6c1-3 3-5 6-5" stroke="#3f6212" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="9" cy="18" rx="8" ry="10" fill="#ea580c" />
      <ellipse cx="23" cy="18" rx="8" ry="10" fill="#ea580c" />
      <ellipse cx="16" cy="18" rx="8" ry="11" fill="#f97316" />
      <path className="sg-calabaza-cara" d="M10 15l3-3 3 3zM16 15l3-3 3 3zM9 21l2.5 2 2.5-2 2 2 2-2 2.5 2 2.5-2-1 4h-13z" fill="#fde047" />
    </svg>
  ),
  gorro: (
    <svg viewBox="0 0 40 32" width="36" height="29" aria-hidden="true">
      <path d="M5 24C8 12 18 4 30 6c-3 3-4 8-3 14z" fill="#dc2626" />
      <path d="M30 6c3 1 5 5 4 9" stroke="#dc2626" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="2" y="21" width="28" height="8" rx="4" fill="#fff" />
      <circle className="sg-gorro-pompon" cx="34" cy="16" r="4.2" fill="#fff" />
    </svg>
  ),
  fiesta: (
    <svg viewBox="0 0 28 34" width="24" height="29" aria-hidden="true">
      <path d="M14 3L25 31H3z" fill="#f5b041" />
      <path d="M8.5 17h11M6 24h16M11 10h6" stroke="#0074bc" strokeWidth="3" />
      <circle className="sg-gorro-pompon" cx="14" cy="3" r="3.2" fill="#ec4899" />
      <rect x="2" y="29" width="24" height="4" rx="2" fill="#fff" />
    </svg>
  ),
  corazon: (
    <svg viewBox="0 0 24 22" width="20" height="18" aria-hidden="true">
      <path d="M12 21S1 14 1 7.5A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 11 2.5C23 14 12 21 12 21z" fill="#ec4899" stroke="#fff" strokeWidth="1.5" />
    </svg>
  ),
  bandera: (
    <svg viewBox="0 0 30 26" width="28" height="24" aria-hidden="true">
      <rect x="2" y="2" width="2" height="23" rx="1" fill="#e2e8f0" />
      <g className="sg-bandera-tela">
        <rect x="4" y="3" width="24" height="8" fill="#fcd116" />
        <rect x="4" y="11" width="24" height="4" fill="#003893" />
        <rect x="4" y="15" width="24" height="4" fill="#ce1126" />
      </g>
    </svg>
  ),
};

export function AccesorioLogo({ tipo }) {
  if (!ACCESORIOS[tipo]) return null;
  return <span className={`sg-accesorio sg-accesorio-${tipo}`}>{ACCESORIOS[tipo]}</span>;
}

// ── Partículas del encabezado ───────────────────────────────────────────────
// Solo transform y opacity (las anima la GPU, sin repintar). Posiciones fijas
// pseudoaleatorias para que el render sea estable.

const CONFIG_PARTICULAS = {
  murcielagos: { n: 5, clase: "sg-p-murcielago" },
  nieve: { n: 16, clase: "sg-p-nieve" },
  chispas: { n: 14, clase: "sg-p-chispa" },
  confeti: { n: 16, clase: "sg-p-confeti", colores: ["#f5b041", "#5ab4f5", "#ec4899", "#4ade80", "#ffffff"] },
  tricolor: { n: 16, clase: "sg-p-confeti", colores: ["#fcd116", "#003893", "#ce1126"] },
  corazones: { n: 9, clase: "sg-p-corazon" },
};

const pseudo = (i, semilla) => {
  const x = Math.sin(i * 12.9898 + semilla * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const MURCIELAGO = (
  <svg viewBox="0 0 40 18" width="100%" height="100%" aria-hidden="true">
    <path d="M20 6c-1-2-3-2-3 0-3-3-8-5-15-2 4 1 6 4 6 7 2-2 5-2 6 0 1-2 3-3 4-1 1-2 3-1 4 1 1-2 4-2 6 0 0-3 2-6 6-7-7-3-12-1-15 2 0-2-2-2-3 0z" fill="#140c2b" stroke="#c4b5fd" strokeWidth="0.7" />
  </svg>
);

const CORAZON = (
  <svg viewBox="0 0 24 22" width="100%" height="100%" aria-hidden="true">
    <path d="M12 21S1 14 1 7.5A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 11 2.5C23 14 12 21 12 21z" fill="currentColor" />
  </svg>
);

export function ParticulasFestivas({ tipo }) {
  const cfg = CONFIG_PARTICULAS[tipo];
  if (!cfg) return null;
  return (
    <div className="sg-particulas" aria-hidden="true">
      {Array.from({ length: cfg.n }, (_, i) => {
        const r1 = pseudo(i, 1);
        const r2 = pseudo(i, 2);
        const r3 = pseudo(i, 3);
        const estilo = {
          "--x": `${Math.round(r1 * 100)}%`,
          "--y": `${Math.round(10 + r2 * 55)}%`,
          "--dur": `${(tipo === "murcielagos" ? 9 : 6) + r2 * 6}s`,
          "--retraso": `${-(r3 * 12).toFixed(2)}s`,
          "--tam": `${tipo === "murcielagos" ? 22 + r3 * 14 : 4 + r1 * 6}px`,
          "--deriva": `${Math.round((r3 - 0.5) * 60)}px`,
        };
        if (cfg.colores) estilo["--color"] = cfg.colores[i % cfg.colores.length];
        return (
          <span key={i} className={`sg-particula ${cfg.clase}`} style={estilo}>
            {tipo === "murcielagos" && <span className="sg-aleteo">{MURCIELAGO}</span>}
            {tipo === "corazones" && CORAZON}
          </span>
        );
      })}
    </div>
  );
}

// ── Adornos fijos del encabezado ────────────────────────────────────────────

export function AdornoFestivo({ tipo }) {
  if (tipo === "telarana") {
    return (
      <svg className="sg-adorno-telarana" viewBox="0 0 80 80" aria-hidden="true">
        <g stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none">
          <path d="M0 0L80 30M0 0L62 62M0 0L30 80" />
          <path d="M14 5Q16 13 11 15Q6 14 5 14M28 10Q31 25 22 29Q13 29 10 28M43 16Q45 37 33 44Q21 45 15 43M58 22Q61 49 45 59Q29 61 21 59" />
        </g>
        {/* araña colgando en el margen izquierdo, junto al logo */}
        <line className="sg-arana-hilo" x1="9" y1="16" x2="9" y2="50" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <g className="sg-arana">
          <circle cx="9" cy="54" r="3.4" fill="#f8fafc" />
          <path d="M6 52l-4-3M6 55l-5 0M6 57l-4 3M12 52l4-3M12 55l5 0M12 57l4 3" stroke="#f8fafc" strokeWidth="1.1" />
        </g>
      </svg>
    );
  }
  if (tipo === "luces") {
    // Bombillos en HTML (no SVG estirado) para que no se deformen en pantallas anchas.
    const colores = ["#ef4444", "#facc15", "#22c55e", "#38bdf8", "#f472b6"];
    return (
      <div className="sg-adorno-luces" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="sg-bombillo"
            style={{ "--color": colores[i % colores.length], animationDelay: `${(i % 3) * 0.45}s` }}
          />
        ))}
      </div>
    );
  }
  return null;
}

export function SaludoFestivo({ tema }) {
  const Icono = tema.icono;
  return (
    <div className="sg-festivo-saludo">
      <Icono size={15} aria-hidden="true" />
      {tema.saludo}
    </div>
  );
}

// Mensaje alusivo para la confirmación del marcaje.
export function MensajeFestivo() {
  const tema = useTemaFestivo();
  if (!tema) return null;
  const Icono = tema.icono;
  return (
    <p className="sg-festivo-mensaje" data-tema={tema.id}>
      <Icono size={16} aria-hidden="true" />
      <span>
        <strong>{tema.saludo}</strong> {tema.despedida}
      </span>
    </p>
  );
}
