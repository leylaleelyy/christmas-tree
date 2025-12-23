import React, { useState, useRef, useEffect, useCallback } from 'react';
import Loader from './components/Loader';
import UILayer from './components/UILayer';
import WebcamWrapper from './components/WebcamWrapper';
import { useChristmasTree } from './hooks/useChristmasTree';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [controlsHidden, setControlsHidden] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleLoaded = useCallback(() => {
    setLoading(false);
  }, []);

  const { handleFileUpload } = useChristmasTree(
    containerRef,
    videoRef,
    canvasRef,
    handleLoaded
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setControlsHidden((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
          
          body {
            margin: 0;
            overflow: hidden;
            background-color: #000000;
            font-family: 'Times New Roman', serif;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            touch-action: manipulation;
          }
          
          * {
            -webkit-tap-highlight-color: transparent;
          }
          
          @media (max-width: 768px) {
            body {
              position: fixed;
              width: 100%;
              height: 100%;
            }
          }
        `}
      </style>

      <Loader visible={loading} />

      <div
        ref={containerRef}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      />

      <UILayer 
        onFileUpload={handleFileUpload} 
        controlsHidden={controlsHidden}
        onToggleControls={() => setControlsHidden((prev) => !prev)}
      />

      <WebcamWrapper videoRef={videoRef} canvasRef={canvasRef} />
    </>
  );
};

export default App;
