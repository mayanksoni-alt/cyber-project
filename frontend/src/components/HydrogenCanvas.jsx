import { useEffect, useRef } from 'react';

/**
 * Smooth Hydrogen particle canvas calibrated for both the Blue-Beige light
 * gradient and Night mode palettes.
 */
export default function HydrogenCanvas({ theme = 'light', activePulse = false }) {
  const canvasRef = useRef(null);
  const pulseRef = useRef(activePulse);
  pulseRef.current = activePulse;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: -9999, y: -9999 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const count = Math.min(38, Math.max(18, Math.floor((width * height) / 40000)));
    const palette =
      theme === 'night'
        ? ['96, 165, 250', '230, 196, 150', '45, 212, 191']
        : ['37, 99, 235', '184, 135, 84', '13, 148, 136'];

    const nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.36,
      vy: (Math.random() - 0.5) * 0.36,
      r: 1.7 + Math.random() * 1.9,
      rgb: palette[i % palette.length],
    }));

    let rafId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const speedMul = pulseRef.current ? 1.75 : 1;
      const maxDist = 145;
      const lineAlphaMax = theme === 'night' ? 0.18 : 0.12;
      const dotAlpha = theme === 'night' ? 0.42 : 0.28;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!prefersReduced) {
          n.x += n.vx * speedMul;
          n.y += n.vy * speedMul;

          if (n.x < -20) n.x = width + 20;
          if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          if (n.y > height + 20) n.y = -20;
        }

        const dxM = mouse.x - n.x;
        const dyM = mouse.y - n.y;
        const distM = Math.hypot(dxM, dyM);
        if (distM < 165) {
          const alpha = (1 - distM / 165) * (theme === 'night' ? 0.28 : 0.18);
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle =
            theme === 'night'
              ? `rgba(96, 165, 250, ${alpha.toFixed(3)})`
              : `rgba(37, 99, 235, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < maxDist) {
            const alpha = (1 - d / maxDist) * lineAlphaMax;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(${n.rgb}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        ctx.fillStyle = `rgba(${n.rgb}, ${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReduced) {
        rafId = requestAnimationFrame(draw);
      }
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="hydrogen-canvas" aria-hidden="true" />;
}
