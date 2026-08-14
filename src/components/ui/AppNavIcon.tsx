import React from 'react';

interface AppNavIconProps {
  children: React.ReactNode;
  active?: boolean;
  nudgeX?: number;
  nudgeY?: number;
  scale?: number;
  className?: string;
}

export function AppNavIcon({
  children,
  active = false,
  nudgeX = 0,
  nudgeY = 0,
  scale = 1,
  className = '',
}: AppNavIconProps) {
  return (
    <div 
      className={`app-nav-icon ${className}`}
      style={{
        width: 46,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 42,
          height: 40,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          boxShadow: 'none',
          transform: `translate(${nudgeX}px, ${nudgeY}px) scale(${scale * (active ? 1.02 : 1) * 0.72})`,
          transition: 'transform 180ms ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
