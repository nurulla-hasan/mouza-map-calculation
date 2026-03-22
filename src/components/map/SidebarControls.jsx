import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { DECIMALS } from '@/utils/mapCalculations';

export const SidebarControls = memo(({
  selectedFile,
  image,
  mode,
  setMode,
  scale,
  manualScale,
  setManualScale,
  showManualScale,
  setShowManualScale,
  calibrationLine,
  setCalibrationLine,
  plotPoints,
  setPlotPoints,
  isPlotFinished,
  results,
  setIsDrawing,
  setIsModalOpen,
  setSnapHint,
  clearPlot,
  finishPlot,
  handleImageUpload,
  handleClearFile,
  handleSaveJSON,
  handleLoadClick,
  handleLoadChange,
  handleManualScaleSubmit,
  loadInputRef,
  lastCalibClickRef,
}) => {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">1. ম্যাপ আপলোড করুন</label>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            {!selectedFile ? (
              <div className="flex items-center justify-center w-full">
                <label htmlFor="map-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-muted-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, JPG
                    </p>
                  </div>
                  <input 
                    id="map-upload" 
                    type="file" 
                    onChange={handleImageUpload} 
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full p-3 border rounded-md bg-background">
                <div className="flex items-center space-x-2 truncate">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  <span className="text-sm font-medium text-foreground truncate max-w-50">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>
          {/* Save / Load JSON controls */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={handleSaveJSON} title={!isPlotFinished || !results ? 'Finish & Calculate the plot first' : undefined}>
              JSON সংরক্ষণ করুন
            </Button>
            <Button onClick={handleLoadClick} variant="blue" title={!image ? 'Upload a map first' : undefined}>
              JSON লোড করুন
            </Button>
            <input ref={loadInputRef} type="file" accept="application/json" className="hidden" onChange={handleLoadChange} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">2. স্কেল সেট করুন</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button 
                variant={mode === 'calibrating' ? 'default' : 'outline'}
                onClick={() => { 
                  setMode('calibrating'); 
                  setShowManualScale(false);
                  clearPlot(); 
                  setIsDrawing(false); 
                  setCalibrationLine([]); 
                  lastCalibClickRef.current = 0; 
                }} 
                disabled={!image || mode === 'calibrating'} 
                className="flex-1"
              >
                {mode === 'calibrating' ? 'স্কেল আঁকা হচ্ছে...' : 'স্কেল আঁকুন'}
              </Button>
              <Button 
                variant={showManualScale ? 'default' : 'outline'}
                onClick={() => {
                  setShowManualScale(!showManualScale);
                  if (showManualScale) {
                    setMode('none');
                  } else {
                    setMode('manual_scale');
                  }
                }} 
                disabled={!image}
                className="flex-1"
              >
                {showManualScale ? 'বাতিল করুন' : 'ম্যানুয়াল স্কেল'}
              </Button>
            </div>
            {showManualScale && (
              <form onSubmit={handleManualScaleSubmit} className="flex gap-2">
                <Input
                  type="number"
                  value={manualScale}
                  onChange={(e) => setManualScale(e.target.value)}
                  placeholder="পিক্সেল প্রতি ফুট (যেমন: 0.43)"
                  className="flex-1"
                  step="0.000001"
                  min="0.000001"
                  required
                />
                <Button type="submit" variant="blue">সেট করুন</Button>
              </form>
            )}
            {scale && (
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <div>বর্তমান স্কেল: 1 পিক্সেল = {(1/scale).toFixed(DECIMALS)} ফুট</div>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">3. প্লট আঁকুন</label>
          <Button onClick={() => { setMode('drawing_plot'); clearPlot(); }} disabled={!image || !scale || mode === 'drawing_plot'} className="w-full">
            {mode === 'drawing_plot' ? 'ম্যাপে কোণে ক্লিক করুন' : 'প্লট আঁকুন'}
          </Button>
        </div>
      </div>
      {mode === 'calibrating' && (
        <div className="flex gap-4 mt-4">
          <Button
            onClick={() => {
              if (calibrationLine.length >= 4) {
                setIsDrawing(false);
                setMode('none');
                setIsModalOpen(true);
              }
            }}
            disabled={calibrationLine.length < 4}
            className="grow"
          >
            স্কেল নিশ্চিত করুন
          </Button>
          <Button
            onClick={() => {
              if (calibrationLine.length >= 4) {
                setCalibrationLine([calibrationLine[0], calibrationLine[1]]);
                setIsDrawing(true);
              } else if (calibrationLine.length >= 2) {
                setCalibrationLine([]);
                setIsDrawing(false);
                lastCalibClickRef.current = 0;
              }
            }}
            disabled={calibrationLine.length < 2}
            variant="outline"
          >
            পূর্বাবস্থায় ফেরান
          </Button>
          <Button
            onClick={() => { setCalibrationLine([]); setIsDrawing(false); setMode('none'); }}
            variant="destructive"
          >
            <X />
          </Button>
        </div>
      )}
      {mode === 'drawing_plot' && (
        <div className="flex flex-wrap gap-4 mt-4">
          <Button onClick={finishPlot} disabled={plotPoints.length < 3} className="grow">শেষ করুন ও হিসাব করুন</Button>
          <Button onClick={() => setPlotPoints(p => p.slice(0, -1))} disabled={plotPoints.length === 0} variant="yellow">পূর্বাবস্থায় ফেরান</Button>
          <Button onClick={() => { setMode('none'); setIsDrawing(false); setSnapHint(false); }} variant="destructive" title="আঁকা বন্ধ করুন">
            <X />
          </Button>
        </div>
      )}
    </div>
  );
});
