import React from 'react';

interface LoaderProps {
  visible: boolean;
}

const Loader: React.FC<LoaderProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#000',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.8s ease-out',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderTop: '1px solid #d4af37',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <div
        style={{
          color: '#d4af37',
          fontSize: 14,
          letterSpacing: 4,
          marginTop: 20,
          textTransform: 'uppercase',
          fontWeight: 100,
        }}
      >
        Loading Holiday Magic
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Loader;
