import React from 'react';

export default function IBeamSVG({ profile }) {
  // O uso de 'currentColor' permite que a imagem se adapte ao tema claro ou escuro
  const lineColor = "currentColor";
  const textOpacity = "0.8";
  
  return (
    <div className="w-full h-full flex items-center justify-center relative group">
      {/* Background mais limpo com leve brilho por trás do perfil */}
      <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl transform scale-75 group-hover:scale-90 transition-transform duration-700"></div>
      
      <svg viewBox="-120 -150 240 300" className="w-full h-full font-bold font-data-mono text-on-surface drop-shadow-md transition-transform duration-500 group-hover:scale-105 relative z-10">
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" /> {/* blue-500 */}
            <stop offset="100%" stopColor="#1d4ed8" /> {/* blue-700 */}
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker id="arrow-start" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 Z" fill={lineColor} opacity="0.5" />
          </marker>
          <marker id="arrow-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={lineColor} opacity="0.5" />
          </marker>
        </defs>

        {/* Eixos X e Y */}
        <line x1="0" y1="-130" x2="0" y2="130" stroke={lineColor} strokeDasharray="4,4" strokeWidth="0.75" opacity="0.3" />
        <line x1="-100" y1="0" x2="100" y2="0" stroke={lineColor} strokeDasharray="4,4" strokeWidth="0.75" opacity="0.3" />
        <text x="0" y="-135" fill={lineColor} fontSize="10" textAnchor="middle" opacity="0.5">Y</text>
        <text x="0" y="145" fill={lineColor} fontSize="10" textAnchor="middle" opacity="0.5">Y</text>
        <text x="-105" y="3" fill={lineColor} fontSize="10" textAnchor="end" opacity="0.5">X</text>
        <text x="105" y="3" fill={lineColor} fontSize="10" textAnchor="start" opacity="0.5">X</text>

        {/* Geometria do Perfil I */}
        <path d="
          M -40 -80
          L 40 -80
          L 40 -68
          L 6 -68
          A 6 6 0 0 0 4 -62
          L 4 62
          A 6 6 0 0 0 6 68
          L 40 68
          L 40 80
          L -40 80
          L -40 68
          L -6 68
          A 6 6 0 0 0 -4 62
          L -4 -62
          A 6 6 0 0 0 -6 -68
          L -40 -68
          Z"
          fill="url(#beamGradient)" 
          stroke="#1e3a8a" 
          strokeWidth="1.5" 
          filter="url(#glow)"
        />

        {/* Linha Tracejada do Eixo Y na Alma */}
        <line x1="0" y1="-80" x2="0" y2="80" stroke="#ffffff" strokeDasharray="3,3" strokeWidth="0.5" opacity="0.4" />

        {/* --- COTAS E DIMENSÕES --- */}
        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Cota d (Altura total) - Direita */}
          <line x1="45" y1="-80" x2="65" y2="-80" />
          <line x1="45" y1="80" x2="65" y2="80" />
          <line x1="60" y1="-75" x2="60" y2="75" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        </g>
        <text x="68" y="4" fill={lineColor} fontSize="12" textAnchor="start" opacity={textOpacity}>d</text>

        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Cota d' (Altura parte reta da alma) - Interno Direita */}
          <line x1="10" y1="-62" x2="30" y2="-62" />
          <line x1="10" y1="62" x2="30" y2="62" />
          <line x1="25" y1="-57" x2="25" y2="57" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        </g>
        <text x="32" y="4" fill={lineColor} fontSize="12" textAnchor="start" opacity={textOpacity}>d'</text>

        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Cota h (Distância entre faces internas das mesas) - Esquerda */}
          <line x1="-45" y1="-68" x2="-65" y2="-68" />
          <line x1="-45" y1="68" x2="-65" y2="68" />
          <line x1="-60" y1="-63" x2="-60" y2="63" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        </g>
        <text x="-68" y="4" fill={lineColor} fontSize="12" textAnchor="end" opacity={textOpacity}>h</text>

        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Cota tf superior (Espessura da mesa) - Esquerda */}
          <line x1="-45" y1="-80" x2="-65" y2="-80" />
          <line x1="-60" y1="-95" x2="-60" y2="-85" markerEnd="url(#arrow-end)" />
          <line x1="-60" y1="-53" x2="-60" y2="-63" markerEnd="url(#arrow-end)" />
        </g>
        <text x="-68" y="-71" fill={lineColor} fontSize="12" textAnchor="end" opacity={textOpacity}>tf</text>

        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Cota tf inferior (Espessura da mesa) - Esquerda */}
          <line x1="-45" y1="80" x2="-65" y2="80" />
          <line x1="-60" y1="95" x2="-60" y2="85" markerEnd="url(#arrow-end)" />
          <line x1="-60" y1="53" x2="-60" y2="63" markerEnd="url(#arrow-end)" />
        </g>
        <text x="-68" y="78" fill={lineColor} fontSize="12" textAnchor="end" opacity={textOpacity}>tf</text>

        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Cota bf (Largura da mesa) - Base */}
          <line x1="-40" y1="85" x2="-40" y2="105" />
          <line x1="40" y1="85" x2="40" y2="105" />
          <line x1="-35" y1="100" x2="35" y2="100" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        </g>
        <text x="0" y="115" fill={lineColor} fontSize="12" textAnchor="middle" opacity={textOpacity}>bf</text>

        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Cota tw (Espessura da alma) - Meio inferior esquerdo */}
          <line x1="-20" y1="30" x2="-9" y2="30" markerEnd="url(#arrow-end)" />
          <line x1="12" y1="30" x2="2" y2="30" markerEnd="url(#arrow-end)" />
        </g>
        <text x="-25" y="34" fill={lineColor} fontSize="12" textAnchor="end" opacity={textOpacity}>tw</text>

        <g stroke={lineColor} strokeWidth="1" opacity="0.4">
          {/* Indicador de R (Raio de concordância) - Topo esquerdo */}
          <line x1="-25" y1="-40" x2="-12" y2="-55" markerEnd="url(#arrow-end)" />
        </g>
        <text x="-28" y="-36" fill={lineColor} fontSize="12" textAnchor="end" opacity={textOpacity}>R</text>

      </svg>
    </div>
  );
}
