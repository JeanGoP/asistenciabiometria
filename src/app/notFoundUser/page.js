'use client';
import { useRouter } from 'next/navigation';
import { RotateCcw, UserX } from 'lucide-react';
import { Cabecera, Pie } from '@/components/marca';

const UsuarioNoEncontrado = () => {
  const router = useRouter();

  return (
    <div className="sg-app">
      <Cabecera />
      <main className="sg-cuerpo">
        <section className="sg-panel sg-estado">
          <div className="sg-estado-ico sg-peligro">
            <UserX size={34} aria-hidden="true" />
          </div>
          <h1 className="sg-titulo">Usuario no registrado</h1>
          <p className="sg-sub">No encontramos tu cédula en el sistema. Verifícala o comunícate con Recursos Humanos.</p>
          <button type="button" className="sg-boton" onClick={() => router.push('/')}>
            <RotateCcw size={17} aria-hidden="true" /> Volver a intentar
          </button>
        </section>
      </main>
      <Pie />
    </div>
  );
};

export default UsuarioNoEncontrado;
