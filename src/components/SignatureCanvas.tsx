"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, PenTool } from 'lucide-react';

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  accentColor?: string;
}

export default function SignatureCanvas({
  onSignatureChange,
  disabled = false,
  accentColor = 'var(--primary)'
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to match display width with device pixel ratio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width);
    const height = 180; // comfortable signature height

    // Preserve drawing if resizing
    let tempImage: string | null = null;
    if (canvas.width > 0 && canvas.height > 0 && hasDrawn) {
      tempImage = canvas.toDataURL();
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a';

      if (tempImage) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = tempImage;
      }
    }
  }, [hasDrawn]);

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvas]);

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer so strokes continue smoothly even if pointer moves slightly outside
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    const coords = getCanvasCoordinates(e);
    lastPointRef.current = coords;
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 1.25, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e);
    const last = lastPointRef.current;
    if (!last) {
      lastPointRef.current = coords;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      // Midpoint quadratic curve for buttery smooth lines
      const midX = (last.x + coords.x) / 2;
      const midY = (last.y + coords.y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, midX, midY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }

    lastPointRef.current = coords;
    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const finishDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}

      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    setHasDrawn(false);
    onSignatureChange(null);
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '180px',
          background: '#ffffff',
          borderRadius: '14px',
          border: isDrawing ? `2px solid ${accentColor}` : '2px dashed #cbd5e1',
          boxShadow: isDrawing ? `0 0 0 4px ${accentColor}18` : 'inset 0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: disabled ? 'not-allowed' : 'crosshair'
          }}
        />

        {/* Baseline guideline */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '20px',
            right: '20px',
            borderBottom: '1px dashed #94a3b8',
            pointerEvents: 'none',
            opacity: hasDrawn ? 0.35 : 0.75,
            transition: 'opacity 0.2s'
          }}
        />

        {/* Empty state hint */}
        {!hasDrawn && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <PenTool size={22} color="#94a3b8" />
            <span>יש לחתום כאן באצבע או בעכבר</span>
          </div>
        )}

        {/* Clear button */}
        {hasDrawn && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#475569',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            <RotateCcw size={13} />
            <span>נקה חתימה</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', padding: '0 4px' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          החתימה שלך נשמרת באופן מוצפן ומאובטח בתיק הרפואי.
        </span>
        {hasDrawn && (
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
            ✓ חתימה נקלטה
          </span>
        )}
      </div>
    </div>
  );
}
