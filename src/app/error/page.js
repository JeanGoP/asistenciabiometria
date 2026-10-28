'use client';
import { useRouter } from 'next/navigation';
import { House, TriangleAlert } from 'lucide-react';
import { Cabecera, Pie } from '@/components/marca';

const ErrorPage = () => {
  const router = useRouter();

  return (
    <div className="sg-app">
      <Cabecera />
      <main className="sg-cuerpo">
        <section className="sg-panel sg-estado">
          <div className="sg-estado-ico sg-alerta">
            <TriangleAlert size={32} aria-hidden="true" />
          </div>
          <h1 className="sg-titulo">Algo salió mal</h1>
          <p className="sg-sub">Ocurrió un error inesperado o la página que buscas no existe. Intenta de nuevo en unos segundos.</p>
          <button type="button" className="sg-boton" onClick={() => router.push('/')}>
            <House size={17} aria-hidden="true" /> Volver al inicio
          </button>
        </section>
      </main>
      <Pie />
    </div>
  );
};

export default ErrorPage;
