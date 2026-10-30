import './globals.css';
import { AppProvider } from '@/context/AppContext';

// Tipografía: misma pila que el login de Síntesis Gestión ('Segoe UI',
// system-ui…), definida en globals.css. Ya no se descarga Open Sans.
// Ícono de la pestaña: src/app/icon.svg (isotipo de la app, convención de Next).

export const metadata = {
  title: 'Control biométrico · Síntesis Gestión',
  description: 'Registro de asistencia con reconocimiento facial.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#003862',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {/* lordicon.js se cargaba con beforeInteractive (bloqueaba cada carga)
            y ningún componente usa <lord-icon>: se eliminó. */}
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
