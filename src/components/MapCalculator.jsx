
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Line, Circle } from 'react-konva';
import * as pdfjs from 'pdfjs-dist';

// Setup PDF.js worker (Vite-friendly)
// Use the ESM worker path. Vite will resolve this URL at build time.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// --- Helper Functions & Constants ---
const SHOTOK_SQ_FT = 435.6;
const KATHA_SQ_FT = 720;

const calculatePolygonData = (points, scale) => {
  if (points.length < 3 || !scale) return null;

  const lengths = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    lengths.push(pixelDist / scale);
  }

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += (p1.x * p2.y - p2.x * p1.y);
  }
  const pixelArea = Math.abs(area / 2);
  const sqft = pixelArea / (scale * scale);

  return {
    sqft: sqft,
    shotok: sqft / SHOTOK_SQ_FT,
    katha: sqft / KATHA_SQ_FT,
    lengths: lengths,
  };
};

// --- Components ---
const Modal = ({ isOpen, onClose, onSubmit }) => {
  const [distance, setDistance] = useState('');
  const [error, setError] = useState('');
  if (!isOpen) return null;

  const handleSubmit = () => {
    const num = parseFloat(distance);
    if (Number.isFinite(num) && num > 0) {
      onSubmit(num);
      setDistance('');
      setError('');
    } else {
      setError('Distance must be a number greater than 0');
    }
  };

  const handleClose = () => {
    setDistance('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 print:hidden">
      <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-1/3">
        <h3 className="text-lg font-semibold mb-4">Enter Real Distance</h3>
        <input 
          type="number" 
          value={distance} 
          onChange={(e) => setDistance(e.target.value)} 
          placeholder="e.g., 330 (in feet)" 
          className="w-full p-2 border border-gray-300 rounded-md mb-2"
          min="0"
          step="any"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex justify-end gap-4">
          <button onClick={handleClose} className="px-4 py-2 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700">Submit</button>
        </div>
      </div>
    </div>
  );
};

const ResultsDisplay = ({ results, onPrint }) => {
  if (!results) return null;

  return (
    <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Calculation Results</h3>
        <button onClick={onPrint} className="px-4 py-2 rounded-md font-semibold text-white bg-gray-700 hover:bg-gray-800 print:hidden">Print Report</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Area (Shotok)</p>
          <p className="text-2xl font-bold text-green-600">{results.shotok.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Area (Katha)</p>
          <p className="text-2xl font-bold text-blue-600">{results.katha.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Area (Sq. Ft.)</p>
          <p className="text-2xl font-bold text-purple-600">{results.sqft.toFixed(2)}</p>
        </div>
      </div>
      <div className="mt-4">
        <h4 className="font-semibold mb-2">Side Lengths (in feet):</h4>
        <ul className="list-disc list-inside bg-white p-3 rounded-md">
          {results.lengths.map((len, i) => (
            <li key={i} className="text-gray-700">Side {i + 1}: {len.toFixed(2)} ft</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const PrintLayout = React.forwardRef(({ results, reportImage }, ref) => {
  if (!results || !reportImage) return null;
  return (
    <div ref={ref} className="hidden print:block p-8">
      <h1 className="text-2xl font-bold mb-4 border-b pb-2">Mouza Map Calculation Report</h1>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Calculated Area</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Unit</th>
              <th className="p-2 border">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="p-2 border">Shotok</td><td className="p-2 border">{results.shotok.toFixed(2)}</td></tr>
            <tr><td className="p-2 border">Katha</td><td className="p-2 border">{results.katha.toFixed(2)}</td></tr>
            <tr><td className="p-2 border">Square Feet</td><td className="p-2 border">{results.sqft.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Side Lengths</h2>
        <ul className="list-disc list-inside">
          {results.lengths.map((len, i) => (
            <li key={i}>Side {i + 1}: {len.toFixed(2)} ft</li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Map with Plot</h2>
        <img src={reportImage} alt="Calculated Plot" className="w-full border" />
      </div>
      <p className="text-xs text-gray-500 mt-8 text-center">Generated by Online Mouza Map Calculator</p>
    </div>
  );
});

const MapCalculator = () => {
  const [image, setImage] = useState(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const printRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const lastCalibClickRef = useRef(0);

  // State Management
  const [mode, setMode] = useState('none');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  
  // Scale State
  const [scale, setScale] = useState(null);
  const [calibrationLine, setCalibrationLine] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Plot State
  const [plotPoints, setPlotPoints] = useState([]);
  const [results, setResults] = useState(null);
  const [isPlotFinished, setIsPlotFinished] = useState(false);
  const [reportImage, setReportImage] = useState(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({ width: containerRef.current.offsetWidth, height: window.innerHeight * 0.7 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (isPlotFinished) {
      const newResults = calculatePolygonData(plotPoints, scale);
      setResults(newResults);
    }
  }, [plotPoints, scale, isPlotFinished]);

  const resetState = (fullReset = true) => {
    if(fullReset) setImage(null);
    setScale(null);
    setCalibrationLine([]);
    setPlotPoints([]);
    setResults(null);
    setReportImage(null);
    setMode('none');
    setIsDrawing(false);
    setIsPlotFinished(false);
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type === "application/pdf") {
      reader.onload = async (event) => {
        try {
          const typedarray = new Uint8Array(event.target.result);
          const pdf = await pdfjs.getDocument(typedarray).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const img = new window.Image();
          img.src = canvas.toDataURL();
          img.onload = () => { resetState(true); setImage(img); };
        } catch (error) {
          console.error("Error processing PDF:", error);
          alert("Failed to load PDF file. It might be corrupted or invalid.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => { resetState(true); setImage(img); };
      };
      reader.readAsDataURL(file);
    }
  };

  const getPointerPos = (stage) => {
    const pos = stage.getPointerPosition();
    return { x: (pos.x - stagePos.x) / stageScale, y: (pos.y - stagePos.y) / stageScale };
  };

  const handleStageMouseDown = (e) => {
    if (mode === 'none') return;
    const stage = e.target.getStage();
    const pos = getPointerPos(stage);
    if (mode === 'calibrating') {
      const now = Date.now();
      if (now - lastCalibClickRef.current < 250) {
        // Ignore rapid successive clicks (double-click)
        return;
      }
      lastCalibClickRef.current = now;
      if (calibrationLine.length < 2) {
        // First click
        setCalibrationLine([pos.x, pos.y]);
        setIsDrawing(true);
      } else {
        // Second click
        const [x1, y1] = calibrationLine;
        const x2 = pos.x;
        const y2 = pos.y;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 1e-3) {
          // Ignore extremely small lines
          return;
        }
        setCalibrationLine([x1, y1, x2, y2]);
        setIsDrawing(false);
        setMode('none');
        setIsModalOpen(true);
      }
    } else if (mode === 'drawing_plot') {
      setPlotPoints(prev => [...prev, { x: pos.x, y: pos.y }]);
    }
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / 1.1 : oldScale * 1.1;
    setStageScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  const _handleModalSubmit = (realDistance) => {
    if (!Number.isFinite(realDistance) || realDistance <= 0) {
      alert('Please enter a distance greater than 0');
      return;
    }
    const [x1, y1, x2, y2] = calibrationLine;
    const pixelDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const newScale = pixelDistance / realDistance;
    setScale(newScale);
    setIsModalOpen(false);
    setCalibrationLine([]);
  };

  const handlePointDragEnd = (e, index) => {
    const newPoints = [...plotPoints];
    newPoints[index] = { x: e.target.x(), y: e.target.y() };
    setPlotPoints(newPoints);
  };

  const finishPlot = () => {
    if (plotPoints.length < 3) return;
    setIsPlotFinished(true);
    setMode('none');
    // Capture image for report
    setTimeout(() => {
      if (stageRef.current) {
        setReportImage(stageRef.current.toDataURL({ pixelRatio: 2 }));
      }
    }, 100); // Timeout to allow canvas to re-render before capture
  };
  
  const clearPlot = () => {
    setPlotPoints([]);
    setResults(null);
    setIsPlotFinished(false);
    setReportImage(null);
  }

  const handlePrint = () => {
    window.print();
  }

  const flatPlotPoints = plotPoints.flatMap(p => [p.x, p.y]);

  // Mobile-friendly zoom controls
  const zoomAtCenter = (factor) => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stageScale;
    const newScale = Math.max(0.1, Math.min(10, oldScale * factor));
    const pointer = { x: stageSize.width / 2, y: stageSize.height / 2 };
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  const resetView = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => { setCalibrationLine([]); setIsDrawing(false); setIsModalOpen(false); }} onSubmit={_handleModalSubmit} />
      <div className="p-4 md:p-8 print:hidden">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Mouza Map Calculator</h1>
          
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1. Upload Map</label>
                <input type="file" onChange={handleImageUpload} accept=".pdf,.png,.jpg,.jpeg" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2. Set Scale</label>
                <button onClick={() => { setMode('calibrating'); clearPlot(); setIsDrawing(false); setCalibrationLine([]); lastCalibClickRef.current = 0; }} disabled={!image || mode === 'calibrating'} className="w-full px-4 py-2 rounded-md font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">{mode === 'calibrating' ? 'Drawing scale... (2 clicks)' : 'Set Scale'}</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">3. Draw Plot</label>
                <button onClick={() => { setMode('drawing_plot'); clearPlot(); }} disabled={!scale || mode === 'drawing_plot'} className="w-full px-4 py-2 rounded-md font-semibold text-white bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400">{mode === 'drawing_plot' ? 'Click corners on map...' : 'Draw Plot'}</button>
              </div>
            </div>
            {mode === 'drawing_plot' && (
              <div className="flex gap-4 mt-4">
                <button onClick={finishPlot} disabled={plotPoints.length < 3} className="flex-grow px-4 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">Finish & Calculate</button>
                <button onClick={() => setPlotPoints(p => p.slice(0, -1))} disabled={plotPoints.length === 0} className="px-4 py-2 rounded-md font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400">Undo</button>
                <button onClick={clearPlot} disabled={plotPoints.length === 0} className="px-4 py-2 rounded-md font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-400">Clear</button>
              </div>
            )}
          </div>

          {scale && !results && (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mb-4 text-sm" role="alert">
              <p><span className="font-bold">Scale Set:</span> 1 foot ≈ {scale.toFixed(2)} pixels. Ready to draw a plot.</p>
            </div>
          )}
          {/* Zoom Controls for Mobile */}
          <div className="flex gap-2 justify-end mb-3">
            <button onClick={() => zoomAtCenter(1.2)} className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm">Zoom In</button>
            <button onClick={() => zoomAtCenter(1/1.2)} className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm">Zoom Out</button>
            <button onClick={resetView} className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm">Reset View</button>
          </div>
          
          <div className={`border border-gray-300 rounded-lg shadow-sm overflow-hidden ${mode !== 'none' ? 'cursor-crosshair' : 'cursor-grab'} touch-none select-none`} ref={containerRef}>
            <Stage 
              ref={stageRef}
              width={stageSize.width} 
              height={stageSize.height} 
              onMouseDown={handleStageMouseDown}
              onWheel={handleWheel}
              onMouseMove={(e) => {
                if (mode === 'calibrating' && isDrawing) {
                  const stage = e.target.getStage();
                  const pos = getPointerPos(stage);
                  setCalibrationLine((prev) => {
                    if (prev.length >= 2) return [prev[0], prev[1], pos.x, pos.y];
                    return prev;
                  });
                }
              }}
              onTouchStart={(e) => {
                // prevent page scroll/zoom
                e.evt.preventDefault();
                handleStageMouseDown(e);
              }}
              onTouchMove={(e) => {
                e.evt.preventDefault();
                if (mode === 'calibrating' && isDrawing) {
                  const stage = e.target.getStage();
                  const pos = getPointerPos(stage);
                  setCalibrationLine((prev) => {
                    if (prev.length >= 2) return [prev[0], prev[1], pos.x, pos.y];
                    return prev;
                  });
                }
              }}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePos.x}
              y={stagePos.y}
              draggable={mode === 'none' || isPlotFinished}
              onDragEnd={(e) => setStagePos(e.target.position())}
            >
              <Layer>
                {image && <Image image={image} />}
                {calibrationLine.length > 0 && <Line points={calibrationLine} stroke="#E53E3E" strokeWidth={3 / stageScale} dash={[10 / stageScale, 5 / stageScale]} />}
                {plotPoints.length > 0 && <Line points={[...flatPlotPoints, ... (isPlotFinished ? [plotPoints[0].x, plotPoints[0].y] : [])]} stroke="#3182CE" strokeWidth={3 / stageScale} closed={isPlotFinished} />}
                {plotPoints.map((point, i) => (
                  <Circle
                    key={i}
                    x={point.x}
                    y={point.y}
                    radius={6 / stageScale}
                    fill="#3182CE"
                    stroke="white"
                    strokeWidth={2 / stageScale}
                    hitStrokeWidth={20 / stageScale}
                    draggable={isPlotFinished}
                    onDragEnd={(e) => handlePointDragEnd(e, i)}
                  />
                ))}
              </Layer>
            </Stage>
          </div>

          <ResultsDisplay results={results} onPrint={handlePrint} />
        </div>
      </div>
      <PrintLayout ref={printRef} results={results} reportImage={reportImage} />
    </>
  );
};

export default MapCalculator;
