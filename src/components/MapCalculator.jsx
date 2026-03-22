
import React from 'react';
import { Button } from '@/components/ui/button';
import { DECIMALS } from '@/utils/mapCalculations';
import { DistanceModal } from './map/DistanceModal';
import { ResultsDisplay } from './map/ResultsDisplay';
import { PrintLayout } from './map/PrintLayout';
import { SidebarControls } from './map/SidebarControls';
import { KonvaStage } from './map/KonvaStage';
import { useMapState } from '@/hooks/useMapState';

const MapCalculator = () => {
  const {
    image, selectedFile,
    containerRef, stageRef, printRef, loadInputRef, resultsRef,
    stageSize,
    lastCalibClickRef, isPinchingRef, lastPinchDistRef, pinchStartRef, pinchRafRef, blockTapRef, pinchLastStartRef, touchSessionRef,
    TAP_GRACE_MS, TAP_MIN_MS,
    mode, setMode,
    isModalOpen, setIsModalOpen,
    stagePos, setStagePos,
    stageScale,
    isPinching, setIsPinching,
    scale, manualScale, setManualScale,
    showManualScale, setShowManualScale,
    calibrationLine, setCalibrationLine,
    isDrawing, setIsDrawing,
    plotPoints, setPlotPoints,
    results,
    isPlotFinished,
    reportImage,
    snapHint, setSnapHint,
    imageName, setImageName,
    
    // Actions
    handleManualScaleSubmit,
    handleClearFile,
    handleImageUpload,
    addCenterPoint,
    handleStageMouseDown,
    handleWheel,
    _handleModalSubmit,
    handlePointDragEnd,
    finishPlot,
    clearPlot,
    handlePrint,
    handleSaveJSON,
    handleLoadClick,
    handleLoadChange,
    
    // Helpers
    clamp, zoomAtPoint, getDistance, getMidpoint, getStageCenterPoint,
    flatPlotPoints,
  } = useMapState();

  return (
    <>
      <DistanceModal isOpen={isModalOpen} onClose={() => { setCalibrationLine([]); setIsDrawing(false); setIsModalOpen(false); }} onSubmit={_handleModalSubmit} />
      <div className="p-4 md:p-8 print:hidden">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">মৌজা ম্যাপ ক্যালকুলেটর</h1>

          <SidebarControls
            selectedFile={selectedFile}
            image={image}
            mode={mode}
            setMode={setMode}
            scale={scale}
            manualScale={manualScale}
            setManualScale={setManualScale}
            showManualScale={showManualScale}
            setShowManualScale={setShowManualScale}
            calibrationLine={calibrationLine}
            setCalibrationLine={setCalibrationLine}
            plotPoints={plotPoints}
            setPlotPoints={setPlotPoints}
            isPlotFinished={isPlotFinished}
            results={results}
            setIsDrawing={setIsDrawing}
            setIsModalOpen={setIsModalOpen}
            setSnapHint={setSnapHint}
            clearPlot={clearPlot}
            finishPlot={finishPlot}
            handleImageUpload={handleImageUpload}
            handleClearFile={handleClearFile}
            handleSaveJSON={handleSaveJSON}
            handleLoadClick={handleLoadClick}
            handleLoadChange={handleLoadChange}
            handleManualScaleSubmit={handleManualScaleSubmit}
            loadInputRef={loadInputRef}
            lastCalibClickRef={lastCalibClickRef}
          />

          {/* Scale badge above canvas */}
            {scale && (
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="inline-block px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">1 px ≈ {(1/scale).toFixed(DECIMALS)} ft</span>
                <Button variant="link" size="sm" onClick={() => { setMode('calibrating'); setCalibrationLine([]); setIsDrawing(false); }}>Change</Button>
              </div>
            )}

          <KonvaStage
            containerRef={containerRef}
            stageRef={stageRef}
            stageSize={stageSize}
            handleStageMouseDown={handleStageMouseDown}
            handleWheel={handleWheel}
            mode={mode}
            isPlotFinished={isPlotFinished}
            plotPoints={plotPoints}
            snapHint={snapHint}
            setSnapHint={setSnapHint}
            isPinchingRef={isPinchingRef}
            setIsPinching={setIsPinching}
            lastPinchDistRef={lastPinchDistRef}
            pinchStartRef={pinchStartRef}
            stageScale={stageScale}
            stagePos={stagePos}
            blockTapRef={blockTapRef}
            pinchLastStartRef={pinchLastStartRef}
            touchSessionRef={touchSessionRef}
            pinchRafRef={pinchRafRef}
            setStagePos={setStagePos}
            isPinching={isPinching}
            image={image}
            calibrationLine={calibrationLine}
            flatPlotPoints={flatPlotPoints}
            scale={scale}
            handlePointDragEnd={handlePointDragEnd}
            addCenterPoint={addCenterPoint}
            getStageCenterPoint={getStageCenterPoint}
            getDistance={getDistance}
            getMidpoint={getMidpoint}
            clamp={clamp}
            zoomAtPoint={zoomAtPoint}
            TAP_GRACE_MS={TAP_GRACE_MS}
            TAP_MIN_MS={TAP_MIN_MS}
          />

          <div ref={resultsRef}>
            <ResultsDisplay results={results} onPrint={handlePrint} />
          </div>
        </div>
      </div>
      <PrintLayout ref={printRef} results={results} reportImage={reportImage} imageName={imageName} />
    </>
  );
};

export default MapCalculator;
