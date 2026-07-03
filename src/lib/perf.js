// Instrumentación ligera del flujo biométrico con la API estándar de
// Performance. Cada etapa registra un performance.mark y al final del marcaje
// se imprime un console.table con tiempos reales desde el botón "Registrar".
const PREFIJO = 'bio:';

export function marcar(etapa) {
  try {
    performance.mark(PREFIJO + etapa);
  } catch {
    // la medición nunca debe romper el flujo
  }
}

export function limpiarMarcas() {
  try {
    performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith(PREFIJO))
      .forEach((m) => performance.clearMarks(m.name));
  } catch {}
}

export function resumenMarcaje() {
  try {
    const marcas = performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith(PREFIJO))
      .sort((a, b) => a.startTime - b.startTime);
    if (marcas.length === 0) return;

    const inicio = marcas[0].startTime;
    let previa = inicio;
    const filas = marcas.map((m) => {
      const fila = {
        etapa: m.name.slice(PREFIJO.length),
        'desde inicio (ms)': Math.round(m.startTime - inicio),
        'delta (ms)': Math.round(m.startTime - previa),
      };
      previa = m.startTime;
      return fila;
    });
    console.table(filas);
  } catch {}
}
