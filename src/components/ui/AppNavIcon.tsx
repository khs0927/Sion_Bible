import React, { type CSSProperties } from 'react';

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
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: '72%',
          height: '72%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translate(${nudgeX}px, ${nudgeY}px) scale(${scale})`,
          transition: 'transform 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
