import React, { forwardRef } from 'react';

interface WebcamWrapperProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const WebcamWrapper = forwardRef<HTMLDivElement, WebcamWrapperProps>(
  ({ videoRef, canvasRef }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 120,
          height: 90,
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          // Safari 兼容属性
          webkit-playsinline="true"
          style={{ display: 'none' }}
        />
        <canvas ref={canvasRef} />
      </div>
    );
  }
);

WebcamWrapper.displayName = 'WebcamWrapper';

export default WebcamWrapper;
