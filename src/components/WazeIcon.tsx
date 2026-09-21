import React from 'react';

/**
 * Official Waze Brand Vector SVG
 * Faithful raw-path rendition of the Waze logo: sky-blue gradient speech
 * bubble with a thick dark-blue brand outline, white oval eyes and the
 * signature filled half-moon smile — both outlined in Waze's deep navy.
 * Embedded directly (no icon library); stays crisp at any size.
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
        <linearGradient id="waze-bubble" x1="12" y1="1.6" x2="12" y2="19.4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7CE0FF" />
          <stop offset="0.45" stopColor="#39C3F8" />
          <stop offset="1" stopColor="#149BEA" />
        </linearGradient>
      </defs>

      {/* Speech bubble with bottom-left tail — thick brand outline */}
      <path
        d="M12 1.95a8.05 8.05 0 0 1 8.05 8.05c0 4.449-3.602 8.05-8.05 8.05a8.28 8.28 0 0 1-2.427-.363l-3.792 1.17a.57.57 0 0 1-.71-.687l.95-3.388A8.04 8.04 0 0 1 3.95 10 8.05 8.05 0 0 1 12 1.95z"
        fill="url(#waze-bubble)"
        stroke="#0B7CB4"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      {/* Soft top highlight for depth */}
      <ellipse
        cx="9.05"
        cy="5.5"
        rx="4.5"
        ry="2"
        fill="#ffffff"
        opacity="0.24"
        transform="rotate(-18 9.05 5.5)"
      />

      {/* Eyes — white ovals with deep-navy brand outline */}
      <ellipse
        cx="8.7"
        cy="9.25"
        rx="1.52"
        ry="2.14"
        fill="#ffffff"
        stroke="#0A5E8A"
        strokeWidth="0.65"
      />
      <ellipse
        cx="15.3"
        cy="9.25"
        rx="1.52"
        ry="2.14"
        fill="#ffffff"
        stroke="#0A5E8A"
        strokeWidth="0.65"
      />

      {/* Signature half-moon smile — filled white, navy outline */}
      <path
        d="M7.55 12.75 C8.65 15.05 10.2 16.2 12 16.2 C13.8 16.2 15.35 15.05 16.45 12.75 C15.02 13.72 13.54 14.2 12 14.2 C10.46 14.2 8.98 13.72 7.55 12.75 Z"
        fill="#ffffff"
        stroke="#0A5E8A"
        strokeWidth="0.65"
        strokeLinejoin="round"
      />
    </svg>
  );
}
