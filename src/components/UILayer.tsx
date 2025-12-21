import React, { useRef } from 'react';

interface UILayerProps {
  onFileUpload: (files: FileList) => void;
  controlsHidden: boolean;
}

const UILayer: React.FC<UILayerProps> = ({ onFileUpload, controlsHidden }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 40,
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          color: '#fceea7',
          fontSize: 56,
          margin: 0,
          fontWeight: 400,
          letterSpacing: 6,
          textShadow: '0 0 50px rgba(252, 238, 167, 0.6)',
          background: 'linear-gradient(to bottom, #fff, #eebb66)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Cinzel', 'Times New Roman', serif",
          opacity: 0.9,
          transition: 'opacity 0.5s ease',
        }}
      >
        Merry Christmas
      </h1>

      <div
        style={{
          marginTop: 20,
          pointerEvents: 'auto',
          textAlign: 'center',
          transition: 'opacity 0.5s ease',
          opacity: controlsHidden ? 0 : 1,
        }}
      >
        <label
          style={{
            background: 'rgba(20, 20, 20, 0.6)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            color: '#d4af37',
            padding: '10px 25px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: 3,
            fontSize: 10,
            transition: 'all 0.4s',
            display: 'inline-block',
            backdropFilter: 'blur(5px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#d4af37';
            e.currentTarget.style.color = '#000';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)';
            e.currentTarget.style.color = '#d4af37';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Add Memories
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleChange}
          />
        </label>
        <div
          style={{
            color: 'rgba(212, 175, 55, 0.5)',
            fontSize: 9,
            marginTop: 8,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Press 'H' to Hide Controls
        </div>
      </div>
    </div>
  );
};

export default UILayer;
