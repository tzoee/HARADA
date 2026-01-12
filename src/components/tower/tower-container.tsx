'use client';

import { useRef, useState, useCallback } from 'react';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

interface TowerContainerProps {
  children: React.ReactNode;
}

export function TowerContainer({ children }: TowerContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoomLevel, setZoomLevel, rotationAngle, setRotationAngle } = useUIStore();
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startRotation, setStartRotation] = useState(0);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(zoomLevel + delta);
  }, [zoomLevel, setZoomLevel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setStartRotation(rotationAngle);
  }, [rotationAngle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const newRotation = startRotation + deltaX * 0.2;
    setRotationAngle(newRotation);
  }, [isDragging, startX, startRotation, setRotationAngle]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "tower-perspective h-full w-full overflow-hidden",
        "flex items-center justify-center",
        isDragging && "cursor-grabbing"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="tower-3d transition-transform duration-100"
        style={{
          transform: `
            scale(${zoomLevel})
            rotateY(${rotationAngle}deg)
            rotateX(10deg)
          `,
        }}
      >
        {children}
      </div>
    </div>
  );
}
