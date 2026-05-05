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
        width: 56,
        height: 42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 13,
          background: active ? 'rgba(255,255,255,0.56)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? '0 8px 18px rgba(52,45,39,0.08)' : 'none',
          transform: `translate(${nudgeX}px, ${nudgeY}px) scale(${scale})`,
          transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
