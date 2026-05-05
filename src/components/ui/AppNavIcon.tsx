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
        width: 48,
        height: 34,
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
          width: 32,
          height: 32,
          borderRadius: 12,
          background: active ? 'rgba(255,255,255,0.56)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? '0 6px 14px rgba(52,45,39,0.08)' : 'none',
          transform: `translate(${nudgeX}px, ${nudgeY}px) scale(${scale})`,
          transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
