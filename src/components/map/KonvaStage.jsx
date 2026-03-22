import React, { memo } from 'react';
import { Stage, Layer, Image, Line, Circle, Group, Label as KonvaLabel, Tag, Text } from 'react-konva';
import { DECIMALS } from '@/utils/mapCalculations';
import { Button } from '@/components/ui/button';

export const KonvaStage = memo(({
  containerRef,
  stageRef,
  stageSize,
  handleStageMouseDown,
  handleWheel,
  mode,
  isPlotFinished,
  plotPoints,
  snapHint,
  setSnapHint,
  isPinchingRef,
  setIsPinching,
  lastPinchDistRef,
  pinchStartRef,
  stageScale,
  stagePos,
  blockTapRef,
  pinchLastStartRef,
  touchSessionRef,
  pinchRafRef,
  setStagePos,
  isPinching,
  image,
  calibrationLine,
  flatPlotPoints,
  scale,
  handlePointDragEnd,
  addCenterPoint,
  getStageCenterPoint,
  getDistance,
  getMidpoint,
  clamp,
  zoomAtPoint,
  TAP_GRACE_MS,
  TAP_MIN_MS,
}) => {
  return (
    <div className={`relative border border-gray-300 rounded-lg shadow-sm overflow-hidden cursor-grab touch-none select-none`} ref={containerRef}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageMouseDown}
        onWheel={handleWheel}
        onMouseMove={(e) => {
          if (mode === 'calibrating') {
            // Center-add workflow: do not live-drag the second point with mouse
          } else if (mode === 'drawing_plot' && !isPlotFinished && plotPoints.length >= 3) {
            const pos = getStageCenterPoint();
            const first = plotPoints[0];
            const SNAP_VISUAL_THRESHOLD = 5; // stage-space pixels
            const near = Math.hypot(pos.x - first.x, pos.y - first.y) <= SNAP_VISUAL_THRESHOLD;
            if (near !== snapHint) setSnapHint(near);
          } else if (mode === 'drawing_plot' && snapHint) {
            setSnapHint(false);
          }
        }}
        onTouchStart={(e) => {
          e.evt.preventDefault();
          const touches = e.evt.touches;
          if (touches && touches.length === 2) {
            isPinchingRef.current = true;
            setIsPinching(true);
            const d = getDistance(touches[0], touches[1]);
            lastPinchDistRef.current = d;
            pinchStartRef.current = {
              distance: d,
              scale: stageScale,
              stagePos: { ...stagePos },
              centerClient: getMidpoint(touches[0], touches[1]),
            };
            // suppress single-touch actions during pinch
            blockTapRef.current = true;
            pinchLastStartRef.current = Date.now();
            touchSessionRef.current.active = false;
          } else if (touches && touches.length === 1) {
            // start single-touch session; will add on touchend if still single
            touchSessionRef.current = {
              active: true,
              single: true,
              moved: false,
              startClient: { x: touches[0].clientX, y: touches[0].clientY },
              startTime: Date.now(),
            };
            // reset last pinch marker for this session
            pinchLastStartRef.current = 0;
          }
        }}
        onTouchMove={(e) => {
          e.evt.preventDefault();
          const touches = e.evt.touches;
          if (isPinchingRef.current && touches && touches.length === 2) {
            blockTapRef.current = true;
            const newDist = getDistance(touches[0], touches[1]);
            const start = pinchStartRef.current;
            const delta = Math.abs(newDist - lastPinchDistRef.current);
            // deadzone to avoid jitter
            if (delta < 0.5) return;
            if (!pinchRafRef.current) {
              pinchRafRef.current = requestAnimationFrame(() => {
                pinchRafRef.current = 0;
                if (start.distance > 0) {
                  const rawScale = start.scale * (newDist / start.distance);
                  const clamped = clamp(rawScale, 0.1, 10);
                  const centerClient = getMidpoint(touches[0], touches[1]);
                  zoomAtPoint(clamped, centerClient, { scale: start.scale, pos: start.stagePos });
                }
                lastPinchDistRef.current = newDist;
              });
            }
          } else if (mode === 'calibrating') {
            // Center-add workflow: do not live-drag the second point with touch
          } else if (mode === 'drawing_plot' && !isPlotFinished && plotPoints.length >= 3 && touches && touches.length === 1) {
            const pos = getStageCenterPoint();
            const first = plotPoints[0];
            const SNAP_VISUAL_THRESHOLD = 5; // stage-space pixels
            const near = Math.hypot(pos.x - first.x, pos.y - first.y) <= SNAP_VISUAL_THRESHOLD;
            if (near !== snapHint) setSnapHint(near);
          } else if (mode === 'drawing_plot' && snapHint) {
            setSnapHint(false);
          }
        }}
        onTouchEnd={(e) => {
          const touches = e.evt.touches;
          if (!touches || touches.length < 2) {
            isPinchingRef.current = false;
            setIsPinching(false);
            lastPinchDistRef.current = 0;
            pinchStartRef.current = { distance: 0, scale: stageScale, stagePos: { ...stagePos }, centerClient: { x: 0, y: 0 } };
            // if we suppressed taps due to pinch, clear and do nothing
            if (blockTapRef.current) {
              blockTapRef.current = false;
              touchSessionRef.current.active = false;
              return;
            }
            // complete a single-touch tap if session is valid
            if (touchSessionRef.current.active && touchSessionRef.current.single && !touchSessionRef.current.moved) {
              const now = Date.now();
              const dur = now - (touchSessionRef.current.startTime || now);
              // if pinch started within grace window AFTER touch start, or tap too short, ignore
              const startTime = (touchSessionRef.current.startTime || now);
              const pinchWithinWindow = pinchLastStartRef.current >= startTime && (pinchLastStartRef.current - startTime) <= TAP_GRACE_MS;
              if (pinchWithinWindow || dur < TAP_MIN_MS) {
                touchSessionRef.current.active = false;
                return;
              }
              // Disable tap-to-add; use the center add button instead
            }
            touchSessionRef.current.active = false;
            setSnapHint(false);
          }
        }}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={!isPinching}
        onDragMove={(e) => { 
          setStagePos(e.target.position()); 
          if (mode === 'drawing_plot' && !isPlotFinished && plotPoints.length >= 3) {
            const pos = getStageCenterPoint();
            const first = plotPoints[0];
            const SNAP_VISUAL_THRESHOLD = 5;
            const near = Math.hypot(pos.x - first.x, pos.y - first.y) <= SNAP_VISUAL_THRESHOLD;
            if (near !== snapHint) setSnapHint(near);
          } else if (mode === 'drawing_plot' && snapHint) {
            setSnapHint(false);
          }
        }}
        onDragEnd={(e) => setStagePos(e.target.position())}
      >
        <Layer>
          {image && <Image image={image} />}
          {calibrationLine.length > 0 && (
            <>
              <Line points={calibrationLine} stroke="#E53E3E" strokeWidth={3 / stageScale} dash={[10 / stageScale, 5 / stageScale]} />
              {mode === 'calibrating' && calibrationLine.length === 2 && (() => {
                const center = getStageCenterPoint();
                return <Line points={[calibrationLine[0], calibrationLine[1], center.x, center.y]} stroke="#E53E3E" strokeWidth={2 / stageScale} dash={[5 / stageScale, 5 / stageScale]} opacity={0.7} />;
              })()}
              {calibrationLine.length >= 2 && (
                <Circle x={calibrationLine[0]} y={calibrationLine[1]} radius={8 / stageScale} fill="#E53E3E" shadowColor="#000" shadowBlur={8 / stageScale} shadowOpacity={0.25} stroke="white" strokeWidth={2 / stageScale} />
              )}
              {calibrationLine.length >= 4 && (
                <Circle x={calibrationLine[2]} y={calibrationLine[3]} radius={8 / stageScale} fill="#E53E3E" shadowColor="#000" shadowBlur={8 / stageScale} shadowOpacity={0.25} stroke="white" strokeWidth={2 / stageScale} />
              )}
            </>
          )}
          {mode === 'drawing_plot' && !isPlotFinished && plotPoints.length > 0 && snapHint && (
            <Circle
              x={plotPoints[0].x}
              y={plotPoints[0].y}
              radius={12 / stageScale}
              stroke="#2563EB"
              strokeWidth={3 / stageScale}
              dash={[6 / stageScale, 4 / stageScale]}
              shadowColor="#2563EB"
              shadowBlur={10 / stageScale}
              shadowOpacity={0.6}
            />
          )}
          {plotPoints.length > 0 && <Line points={[...flatPlotPoints, ... (isPlotFinished ? [plotPoints[0].x, plotPoints[0].y] : [])]} stroke="#3182CE" strokeWidth={3 / stageScale} closed={isPlotFinished} />}
          
          {/* Dynamic Line to Center Crosshair while drawing */}
          {mode === 'drawing_plot' && !isPlotFinished && plotPoints.length > 0 && (() => {
            const center = getStageCenterPoint();
            const lastPt = plotPoints[plotPoints.length - 1];
            let targetX = center.x;
            let targetY = center.y;
            if (snapHint && plotPoints.length > 0) {
              targetX = plotPoints[0].x;
              targetY = plotPoints[0].y;
            }
            const dx = targetX - lastPt.x;
            const dy = targetY - lastPt.y;
            const distPx = Math.hypot(dx, dy);
            if (distPx < 1) return null;
            const ft = scale ? (distPx / scale).toFixed(2) : 0;
            const midX = (lastPt.x + targetX) / 2;
            const midY = (lastPt.y + targetY) / 2;
            const fontSize = 14 / stageScale;
            const padding = 4 / stageScale;
            const estWidth = (ft.length * fontSize * 0.6) + padding * 2;
            const estHeight = fontSize + padding * 2;
            
            // Calculate a fixed offset vector perpendicular to the line to push the label away from the line
            const perpX = -dy / distPx;
            const perpY = dx / distPx;
            const offsetDist = 25 / stageScale; // distance to push label away from the line
            
            return (
              <Group>
                <Line points={[lastPt.x, lastPt.y, targetX, targetY]} stroke="#2563EB" strokeWidth={3 / stageScale} dash={[8 / stageScale, 6 / stageScale]} opacity={0.8} />
                {distPx > 20 / stageScale && (
                  <KonvaLabel 
                    x={midX + perpX * offsetDist} 
                    y={midY + perpY * offsetDist} 
                    offsetX={estWidth / 2} 
                    offsetY={estHeight / 2} 
                    opacity={0.9}
                  >
                    <Tag fill="#2563EB" cornerRadius={4 / stageScale} shadowColor="black" shadowBlur={4 / stageScale} shadowOpacity={0.3} shadowOffset={{ x: 0, y: 2 / stageScale }} />
                    <Text text={`${ft} ft`} fontSize={fontSize} fill="white" padding={padding} fontStyle="bold" />
                  </KonvaLabel>
                )}
              </Group>
            );
          })()}

          {/* Lengths for existing segments */}
          {plotPoints.map((point, i) => {
            if (i === plotPoints.length - 1 && !isPlotFinished) return null;
            const nextPoint = plotPoints[(i + 1) % plotPoints.length];
            if (!nextPoint) return null;
            
            const dx = nextPoint.x - point.x;
            const dy = nextPoint.y - point.y;
            const distPx = Math.hypot(dx, dy);
            if (distPx < 15 / stageScale) return null;
            const ft = scale ? (distPx / scale).toFixed(2) : 0;
            
            const midX = (point.x + nextPoint.x) / 2;
            const midY = (point.y + nextPoint.y) / 2;
            const fontSize = 14 / stageScale;
            const padding = 4 / stageScale;
            const estWidth = (ft.length * fontSize * 0.6) + padding * 2;
            const estHeight = fontSize + padding * 2;

            // Calculate a fixed offset vector perpendicular to the line
            const perpX = -dy / distPx;
            const perpY = dx / distPx;
            const offsetDist = 25 / stageScale;
            
            return (
              <KonvaLabel 
                key={`len-${i}`} 
                x={midX + perpX * offsetDist} 
                y={midY + perpY * offsetDist} 
                offsetX={estWidth / 2} 
                offsetY={estHeight / 2} 
                opacity={0.9}
              >
                <Tag fill="#2563EB" cornerRadius={4 / stageScale} shadowColor="black" shadowBlur={4 / stageScale} shadowOpacity={0.3} shadowOffset={{ x: 0, y: 2 / stageScale }} />
                <Text text={`${ft} ft`} fontSize={fontSize} fill="white" padding={padding} fontStyle="bold" />
              </KonvaLabel>
            );
          })}

          {plotPoints.map((point, i) => (
            <Circle
              key={i}
              x={point.x}
              y={point.y}
              radius={5 / stageScale}
              fill="#3182CE"
              stroke="white"
              strokeWidth={1.5 / stageScale}
              hitStrokeWidth={20 / stageScale}
              draggable={isPlotFinished}
              onDragEnd={(e) => handlePointDragEnd(e, i)}
            />
          ))}
        </Layer>
      </Stage>
      {(mode === 'calibrating' || (mode === 'drawing_plot' && !isPlotFinished)) && (
        <>
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0px 0px 1px rgba(255,255,255,0.8))' }}>
              <line x1="12" y1="2" x2="12" y2="10" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="14" x2="12" y2="22" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="12" x2="10" y2="12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="12" x2="22" y2="12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2.5" fill="white" stroke="#2563EB" strokeWidth="1" />
            </svg>
          </div>
          <div className="pointer-events-auto absolute bottom-3 right-3 z-50">
            <Button 
              variant="blue" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                addCenterPoint();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addCenterPoint();
              }}
            >
              পয়েন্ট যোগ করুন
            </Button>
          </div>
        </>
      )}
    </div>
  );
});
