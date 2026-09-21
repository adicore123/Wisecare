import React from 'react';

/**
 * Authentic Waze Vector SVG Icon
 * The classic Waze speech-bubble smiley, rendered with brand proportions —
 * sky-blue gradient bubble, deep-blue outline, white eyes and smile.
 * Scales crisply to any size.
 */
export default function WazeIcon({
  size = 20,
  className = '',
  style = {}
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    >
      <defs>
        <linearGradient id="waze-bubble" x1="12" y1="1.5" x2="12" y2="19.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6FDBFF" />
          <stop offset="0.5" stopColor="#35C2F7" />
          <stop offset="1" stopColor="#17A3E8" />
        </linearGradient>
      </defs>

      {/* Speech bubble with bottom-left tail */}
      <path
        d="M12 1.85a8.15 8.15 0 0 1 8.15 8.15c0 4.504-3.647 8.15-8.15 8.15a8.38 8.38 0 0 1-2.486-.376l-3.67 1.13a.55.55 0 0 1-.69-.662l.92-3.276A8.147 8.147 0 0 1 3.85 10 8.15 8.15 0 0 1 12 1.85z"
        fill="url(#waze-bubble)"
        stroke="#0B84C1"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />

      {/* Soft top highlight for depth */}
      <ellipse
        cx="9.1"
        cy="5.55"
        rx="4.6"
        ry="2.1"
        fill="#ffffff"
        opacity="0.22"
        transform="rotate(-18 9.1 5.55)"
      />

      {/* Eyes */}
      <ellipse cx="8.75" cy="9.4" rx="1.42" ry="2.02" fill="#ffffff" />
      <ellipse cx="15.25" cy="9.4" rx="1.42" ry="2.02" fill="#ffffff" />

      {/* Smile */}
      <path
        d="M7.95 13.05c1.04 1.82 2.42 2.72 4.05 2.72s3.01-.9 4.05-2.72"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}
