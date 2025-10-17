import React from 'react';

const IngresoMarcado = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/images/des.gif" alt="Animación" />

        <h1 style={styles.title}>Registrado Realizado</h1>
        <p style={styles.message}>
          Se ha realizado el registro correctamente. <br />
          <span style={styles.highlight}>Hasta Pronto</span>
        </p>
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
  icon: {
    fontSize: '70px',
    marginBottom: '20px',
    color: '#2e7d32',
    animation: 'pop 1s ease',
  },
  title: {
    fontSize: 'clamp(22px, 5vw, 30px)', // se adapta al tamaño de pantalla
    fontWeight: 'bold',
    color: '#2e7d32',
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
};

// Animaciones CSS
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

@media (max-width: 480px) {
  .card {
    padding: 20px 15px !important;
  }
}
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styleSheet;
  document.head.appendChild(styleEl);
}

export default IngresoMarcado;
