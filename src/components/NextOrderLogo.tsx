import React from 'react';

interface LogoProps {
  className?: string;
  size?: number; // Height and width of the icon
  hideText?: boolean; // Show icon only
  lightText?: boolean; // For dark background
  lang?: 'en' | 'bn';
}

/**
 * Recreates the custom "N + Box + Arrow" logo mark in pixel-perfect vector format.
 * Zero background (transparent) to seamlessly match light or dark templates.
 */
export function NextOrderIcon({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
    >
      <defs>
        {/* Precise gradients sourced from original logo */}
        <linearGradient id="leftPillarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="60%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="orangeBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="navyBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Styled skew mapping for the signature 12-degree athletic angle */}
      <g transform="skewX(-11) translate(14, 0)">
        
        {/* Left Side Pillar of "N" */}
        <path
          d="M 12 75 L 12 30 C 12 26 15 24 18 24 L 23 24 C 26 24 28 26 28 30 L 28 75 C 28 79 26 81 23 81 L 18 81 C 15 81 12 79 12 75 Z"
          fill="url(#leftPillarGrad)"
        />

        {/* Isometric Box nested inside */}
        {/* Left Face - Vibrant Orange */}
        <path
          d="M 30 50 L 49 63 L 49 81 L 30 68 Z"
          fill="url(#orangeBoxGrad)"
        />
        {/* Top-left internal lid flap */}
        <path
          d="M 30 50 L 20 42 L 35 34 L 41 44 Z"
          fill="#f97316"
          opacity="0.9"
        />

        {/* Right Face - Deep Navy Slate */}
        <path
          d="M 49 63 L 70 48 L 70 65 L 49 81 Z"
          fill="url(#navyBoxGrad)"
        />

        {/* Shipping details sticker label (crisp white rectangle on Navy face) */}
        <polyline
          points="54,64 64,57 64,66 54,73"
          fill="#ffffff"
          opacity="1"
        />
        {/* Red & Blue lines on sticker mimicking text info lines */}
        <line x1="56" y1="63.5" x2="62" y2="59.5" stroke="#f97316" strokeWidth="1" />
        <line x1="56" y1="67" x2="62" y2="63" stroke="#f97316" strokeWidth="1" />
        <line x1="56" y1="70.5" x2="60" y2="68" stroke="#2563eb" strokeWidth="1" />

        {/* Clean subtle box corner boundaries */}
        <path
          d="M 30 50 L 49 63 L 70 48 M 49 63 L 49 81"
          stroke="#475569"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Massive up-right ascending Arrow (forms the diagonal and right leg of "N") */}
        <path
          d="M 23 74 L 59 27 L 69 33 L 33 80 Z"
          fill="url(#arrowGrad)"
          opacity="0.98"
        />

        {/* Sharp Arrow Head pointer */}
        <path
          d="M 52 28 L 75 10 L 76 35 L 65 28 Z"
          fill="url(#arrowGrad)"
        />
        
        {/* High-contrast neon cyan glossy edge light highlight gradient */}
        <path
          d="M 23 74 L 75 10"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />

      </g>
    </svg>
  );
}

/**
 * Renders the full logo with precise typography ("NextOrder") and the
 * sub-tagline "E-Commerce Order Management Simplified", optionally in Bengali.
 */
export default function NextOrderLogo({
  className = '',
  size = 46,
  hideText = false,
  lightText = false,
  lang = 'en'
}: LogoProps) {
  return (
    <div className={`flex items-center ${className} select-none`}>
      {!hideText && (
        <div className="flex flex-col text-left">
          {/* Main Title "NextOrder" */}
          <div className="flex items-baseline">
            <span 
              className={`text-xl font-extrabold tracking-tight leading-none ${
                lightText ? 'text-white' : 'text-slate-900'
              }`}
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              Next<span className="text-indigo-600">Order</span>
            </span>
          </div>

          {/* Subtitle / Tagline */}
          <span 
            className={`text-[8.5px] font-extrabold tracking-wider mt-1 uppercase ${
              lightText ? 'text-indigo-200/90' : 'text-slate-500'
            }`}
            style={{ 
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              letterSpacing: '0.07em'
            }}
          >
            {lang === 'bn' 
              ? 'ই-কমার্স অর্ডার ম্যানেজমেন্ট সহজীকরণ' 
              : 'E-Commerce Order Management Simplified'}
          </span>
        </div>
      )}
    </div>
  );
}
