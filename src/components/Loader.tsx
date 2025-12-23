import React, { useState, useEffect } from 'react';

interface LoaderProps {
  visible: boolean;
}

const Loader: React.FC<LoaderProps> = ({ visible }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        padding: isMobile ? '20px' : '0',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: isMobile ? 32 : 40,
          height: isMobile ? 32 : 40,
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderTop: '1px solid #d4af37',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <div
        style={{
          color: '#d4af37',
          fontSize: isMobile ? 11 : 14,
          letterSpacing: isMobile ? 2 : 4,
          marginTop: isMobile ? 16 : 20,
          textTransform: 'uppercase',
          fontWeight: 100,
          textAlign: 'center',
          padding: isMobile ? '0 20px' : '0',
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
