'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

const IngresoMarcado = () => {
  const router = useRouter();
  const regresar = () => {
    router.push('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img width="200" src="/images/found.gif" alt="Animación" />

        <h1 style={styles.title}>Usuario No Registrado</h1>
        <p style={styles.message}>
          <span style={styles.highlight}>Por favor, Valida tu cedula o comunicate con RRHH.</span>
        </p>
        <button
          onClick={() => regresar()}
          style={styles.button}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d9363e')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ff4d4f')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
        >
          Volver a Intentar
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px 30px',
    borderRadius: '20px',
    textAlign: 'center',
    maxWidth: '420px',
    width: '100%',
    animation: 'fadeIn 1s ease',
  },
  title: {
    fontSize: 'clamp(22px, 5vw, 30px)',
    fontWeight: 'bold',
    color: 'red',
    marginBottom: '15px',
  },
  message: {
    fontSize: 'clamp(16px, 3vw, 20px)',
    color: '#555',
    lineHeight: 1.6,
  },
  highlight: {
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#ff4d4f',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    marginTop: '20px',
    width: '100%',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    transform: 'translateY(-2px)',
  },
};

// Animaciones CSS
// Animaciones CSS + estilos del botón
const styleSheet = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-15px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pop {
  0% { transform: scale(0.7); opacity: 0; }
  80% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

/* Estilos del botón */

`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styleSheet;
  document.head.appendChild(styleEl);
}

export default IngresoMarcado;
