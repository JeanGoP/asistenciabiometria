import { CircleCheck } from 'lucide-react';
import { Cabecera, Pie } from '@/components/marca';

// Confirmación final del marcaje (también se muestra si el tipo de registro
// ya estaba marcado hoy, o tras guardar un intento no reconocido).
export default function IngresoMarcado() {
  return (
    <div className="sg-app">
      <Cabecera />
      <main className="sg-cuerpo">
        <section className="sg-panel sg-estado">
          <div className="sg-estado-ico sg-ok">
            <CircleCheck size={36} aria-hidden="true" />
          </div>
          <h1 className="sg-titulo">Registro realizado</h1>
          <p className="sg-sub">Tu registro de asistencia quedó guardado correctamente. ¡Hasta pronto!</p>
        </section>
      </main>
      <Pie />
    </div>
  );
}
