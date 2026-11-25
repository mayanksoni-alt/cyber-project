import { useId } from 'react';

/**
 * Clean Hydrogen orbital diagram with smooth elliptical electron motion,
 * gentle floating drift, and adaptive blue/sand styling for light & night modes.
 */
export default function HydrogenAtom({
  size = 120,
  scanning = false,
  floating = false,
  label = '',
  className = '',
}) {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      className={`h-atom ${scanning ? 'is-scanning' : ''} ${floating ? 'is-floating' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={!label}
    >
      <div className="h-atom-pulse" />
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="h-atom-svg"
        role={label ? 'img' : undefined}
        aria-label={label || undefined}
      >
        <defs>
          <linearGradient id={`ringA-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.72" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id={`ringB-${uid}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--sand)" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        <circle
          cx="100"
          cy="100"
          r="84"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1"
          strokeDasharray="3 7"
          className="h-outer-ring"
        />

        {/* Orbital 1 */}
        <g transform="rotate(-28 100 100)">
          <ellipse
            cx="100"
            cy="100"
            rx="78"
            ry="27"
            fill="none"
            stroke={`url(#ringA-${uid})`}
            strokeWidth="1.75"
            className="h-orbit-path h-orbit-1"
          />
          <circle r="4.8" fill="var(--brand)">
            <animateMotion
              dur={scanning ? '1.5s' : '4.2s'}
              repeatCount="indefinite"
              path="M 22,100 A 78,27 0 1,0 178,100 A 78,27 0 1,0 22,100"
            />
          </circle>
        </g>

        {/* Orbital 2 */}
        <g transform="rotate(32 100 100)">
          <ellipse
            cx="100"
            cy="100"
            rx="78"
            ry="27"
            fill="none"
            stroke={`url(#ringB-${uid})`}
            strokeWidth="1.75"
            className="h-orbit-path h-orbit-2"
          />
          <circle r="4.5" fill="var(--sand)">
            <animateMotion
              dur={scanning ? '2.0s' : '5.2s'}
              begin="-1.4s"
              repeatCount="indefinite"
              path="M 178,100 A 78,27 0 1,1 22,100 A 78,27 0 1,1 178,100"
            />
          </circle>
        </g>

        {/* Orbital 3 */}
        <g transform="rotate(90 100 100)">
          <ellipse
            cx="100"
            cy="100"
            rx="78"
            ry="27"
            fill="none"
            stroke={`url(#ringA-${uid})`}
            strokeWidth="1.5"
            className="h-orbit-path h-orbit-3"
          />
          <circle r="4.2" fill="var(--accent)">
            <animateMotion
              dur={scanning ? '1.35s' : '3.8s'}
              begin="-0.9s"
              repeatCount="indefinite"
              path="M 22,100 A 78,27 0 1,0 178,100 A 78,27 0 1,0 22,100"
            />
          </circle>
        </g>

        {/* Center core */}
        <circle cx="100" cy="100" r="16" fill="var(--brand-tint)" className="h-core-halo" />
        <circle cx="100" cy="100" r="8.5" fill="var(--brand)" className="h-core" />
        <circle cx="100" cy="100" r="3.5" fill="#ffffff" />
      </svg>
    </div>
  );
}
