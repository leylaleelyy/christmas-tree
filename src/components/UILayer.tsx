import React, { useRef, useEffect, useState } from 'react';

interface UILayerProps {
  onFileUpload: (files: FileList) => void;
  controlsHidden: boolean;
  onToggleControls?: () => void;
}

const UILayer: React.FC<UILayerProps> = ({ onFileUpload, controlsHidden, onToggleControls }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        paddingTop: isMobile ? 20 : 40,
        paddingLeft: isMobile ? 16 : 0,
        paddingRight: isMobile ? 16 : 0,
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          color: '#fceea7',
          fontSize: isMobile ? 32 : 56,
          margin: 0,
          fontWeight: 400,
          letterSpacing: isMobile ? 3 : 6,
          textShadow: '0 0 50px rgba(252, 238, 167, 0.6)',
          background: 'linear-gradient(to bottom, #fff, #eebb66)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Cinzel', 'Times New Roman', serif",
          opacity: 0.9,
          transition: 'opacity 0.5s ease',
          textAlign: 'center',
          lineHeight: 1.2,
          pointerEvents: isMobile ? 'auto' : 'none',
          cursor: isMobile ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
        onClick={() => {
          if (isMobile && onToggleControls) {
            onToggleControls();
          }
        }}
      >
        Merry Christmas
      </h1>

      <div
        style={{
          marginTop: isMobile ? 16 : 20,
          pointerEvents: 'auto',
          textAlign: 'center',
          transition: 'opacity 0.5s ease',
          opacity: controlsHidden ? 0 : 1,
          width: '100%',
          maxWidth: isMobile ? '100%' : 'auto',
        }}
        onTouchStart={(e) => {
          // 阻止事件冒泡，避免触发父级的切换逻辑
          e.stopPropagation();
        }}
        onClick={(e) => {
          // 阻止事件冒泡
          e.stopPropagation();
        }}
      >
        <label
          style={{
            background: 'rgba(20, 20, 20, 0.6)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            color: '#d4af37',
            padding: isMobile ? '12px 20px' : '10px 25px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: isMobile ? 2 : 3,
            fontSize: isMobile ? 11 : 10,
            transition: 'all 0.4s',
            display: 'inline-block',
            backdropFilter: 'blur(5px)',
            borderRadius: isMobile ? '8px' : '0',
            minWidth: isMobile ? '140px' : 'auto',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.background = '#d4af37';
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)';
              e.currentTarget.style.color = '#d4af37';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.background = '#d4af37';
            e.currentTarget.style.color = '#000';
          }}
          onTouchEnd={(e) => {
            setTimeout(() => {
              e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)';
              e.currentTarget.style.color = '#d4af37';
            }, 150);
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
        {!isMobile && (
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
        )}
        {isMobile && (
          <div
            style={{
              color: 'rgba(212, 175, 55, 0.4)',
              fontSize: 10,
              marginTop: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Tap Title to Toggle
          </div>
        )}
      </div>
    </div>
  );
};

export default UILayer;
