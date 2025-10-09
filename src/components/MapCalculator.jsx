
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Line, Circle } from 'react-konva';
import * as pdfjs from 'pdfjs-dist';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

// Setup PDF.js worker (Vite-friendly)
// Use the ESM worker path. Vite will resolve this URL at build time.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// --- Helper Functions & Constants ---
const SHOTOK_SQ_FT = 435.6;
const KATHA_SQ_FT = 720;
const DECIMALS = 2; // global decimal precision for display

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
        <h3 className="text-lg font-semibold mb-4">প্রকৃত দূরত্ব লিখুন</h3>
        <Input
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="e.g., 330 (in feet)"
          className="w-full mb-2"
          min="0"
          step="any"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
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
        <h3 className="text-xl font-bold text-gray-800">হিসাবের ফলাফল</h3>
        <Button onClick={onPrint} className="print:hidden">রিপোর্ট প্রিন্ট করুন</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">আয়তন (শতকে)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{results.shotok.toFixed(DECIMALS)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">আয়তন (কাঠায়)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{results.katha.toFixed(DECIMALS)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">আয়তন (বর্গফুটে)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{results.sqft.toFixed(DECIMALS)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <Label className="font-semibold mb-2 block">বাহুর দৈর্ঘ্য (ফুটে):</Label>
        <Card>
          <CardContent className="p-3">
            <SideLengthsList lengths={results.lengths} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ReportTable = ({ results }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Unit</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>শতক</TableCell>
          <TableCell>{results.shotok.toFixed(DECIMALS)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>কাঠা</TableCell>
          <TableCell>{results.katha.toFixed(DECIMALS)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>বর্গফুট</TableCell>
          <TableCell>{results.sqft.toFixed(DECIMALS)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

const SideLengthsList = ({ lengths, decimals = DECIMALS, showPerimeter = true }) => {
  const perimeter = lengths.slice(0, -1).reduce((a, b) => a + b, 0);
  return (
    <>
      <ul className="list-disc list-inside">
        {lengths.slice(0, -1).map((len, i) => (
          <li key={i}>বাহু {i + 1}: {len.toFixed(decimals)} ft</li>
        ))}
      </ul>
      {showPerimeter && (
        <p className="mt-2 font-semibold">পরিসীমা: {perimeter.toFixed(decimals)} ft</p>
      )}
    </>
  );
};

// Print-only layout for the report page
const PrintLayout = React.forwardRef(({ results, reportImage, imageName }, ref) => {
  if (!results || !reportImage) return null;
  const generatedAt = new Date().toLocaleString();
  return (
    <div ref={ref} className="hidden print:block p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{generatedAt}</div>
        <div className="text-sm font-medium text-gray-800">Made By Golap Hasan</div>
      </div>
      <h1 className="text-2xl font-bold mb-1">Mouza Map Calculation Report</h1>
      <div className="text-xs text-gray-600 border-b pb-2 mb-6">
        {imageName ? (<span>Source: {imageName}</span>) : (<span>Source: Uploaded Map</span>)}
      </div>
      <div className="mb-8 break-inside-avoid">
        <h2 className="text-xl font-semibold mb-2">Calculated Area</h2>
        <ReportTable results={results} />
      </div>
      <div className="mb-8 break-inside-avoid">
        <h2 className="text-xl font-semibold mb-2">Side Lengths</h2>
        <SideLengthsList lengths={results.lengths} />
      </div>
      <div className="break-inside-avoid">
        <h2 className="text-xl font-semibold mb-2">Map with Plot</h2>
        <img src={reportImage} alt="Calculated Plot" className="w-full border" />
      </div>
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
  const isPinchingRef = useRef(false);
  const lastPinchDistRef = useRef(0);
  const pinchStartRef = useRef({ distance: 0, scale: 1, stagePos: { x: 0, y: 0 }, centerClient: { x: 0, y: 0 } });
  const pinchRafRef = useRef(0);
  const blockTapRef = useRef(false);
  const pinchLastStartRef = useRef(0);
  const TAP_GRACE_MS = 200; // increased grace window for two-finger detection
  const TAP_MIN_MS = 50;    // minimum touch duration to count as a tap (lowered)
  const touchSessionRef = useRef({ active: false, single: true, moved: false, startClient: { x: 0, y: 0 }, startTime: 0 });
  const wheelRafRef = useRef(0);
  const wheelAccumRef = useRef(0);

  // State Management
  const [mode, setMode] = useState('none');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);

  // Scale State
  const [scale, setScale] = useState(null);
  const [calibrationLine, setCalibrationLine] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Plot State
  const [plotPoints, setPlotPoints] = useState([]);
  const [results, setResults] = useState(null);
  const [isPlotFinished, setIsPlotFinished] = useState(false);
  const [reportImage, setReportImage] = useState(null);
  const [snapHint, setSnapHint] = useState(false);
  const loadInputRef = useRef(null);
  const [imageName, setImageName] = useState('');
  const resultsRef = useRef(null);

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

  // Auto-scroll to results when available
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  const resetState = (fullReset = true) => {
    if (fullReset) setImage(null);
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
      setImageName(file.name || 'document.pdf');
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
          toast.error('PDF লোড করা যায়নি (ফাইলটি ক্ষতিগ্রস্ত বা অবৈধ হতে পারে)');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => { resetState(true); setImageName(file.name || 'image'); setImage(img); };
      };
      reader.readAsDataURL(file);
    }
  };

  const getPointerPos = (stage) => {
    const pos = stage.getPointerPosition();
    return { x: (pos.x - stagePos.x) / stageScale, y: (pos.y - stagePos.y) / stageScale };
  };

  // Reusable logic to add/select based on a stage-space position
  const addPointerByPos = (pos) => {
    if (mode === 'none') return;
    const SNAP_THRESHOLD = 5; // pixels in stage-space
    if (mode === 'calibrating') {
      const now = Date.now();
      if (now - lastCalibClickRef.current < 250) return;
      lastCalibClickRef.current = now;
      if (calibrationLine.length < 2) {
        setCalibrationLine([pos.x, pos.y]);
        setIsDrawing(true);
      } else {
        const [x1, y1] = calibrationLine;
        const x2 = pos.x;
        const y2 = pos.y;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 1e-3) return;
        setCalibrationLine([x1, y1, x2, y2]);
        setIsDrawing(false);
        // remain in calibrating; user will press Confirm Scale
      }
    } else if (mode === 'drawing_plot') {
      setPlotPoints(prev => {
        let { x, y } = pos;
        if (prev.length > 0) {
          const first = prev[0];
          const dx = x - first.x;
          const dy = y - first.y;
          if (Math.hypot(dx, dy) <= SNAP_THRESHOLD) {
            // snap to first point to avoid tiny closing edge
            x = first.x;
            y = first.y;
          }
        }
        // hide snap hint after placing
        setSnapHint(false);
        return [...prev, { x, y }];
      });
    }
  };

  const handleStageMouseDown = (e) => {
    if (mode === 'none') return;
    const stage = e.target.getStage();
    const pos = getPointerPos(stage);
    addPointerByPos(pos);
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    const oldScale = stageScale;
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    // accumulate wheel delta and smooth via RAF
    wheelAccumRef.current += e.evt.deltaY;
    if (!wheelRafRef.current) {
      wheelRafRef.current = requestAnimationFrame(() => {
        wheelRafRef.current = 0;
        const delta = wheelAccumRef.current;
        wheelAccumRef.current = 0;
        // convert delta to smooth zoom factor
        const factor = Math.pow(1.0015, -delta); // negative delta zooms in
        const newScale = clamp(oldScale * factor, 0.1, 10);
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
      });
    }
  };

  const _handleModalSubmit = (realDistance) => {
    if (!Number.isFinite(realDistance) || realDistance <= 0) {
      toast.error('দয়া করে ০ এর চেয়ে বড় দূরত্ব দিন');
      return;
    }
    const [x1, y1, x2, y2] = calibrationLine;
    const pixelDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const newScale = pixelDistance / realDistance;
    setScale(newScale);
    setIsModalOpen(false);
    setCalibrationLine([]);
    toast.success('স্কেল সেট হয়েছে');
  };

  const handlePointDragEnd = (e, index) => {
    const SNAP_THRESHOLD = 5;
    const newPoints = [...plotPoints];
    let x = e.target.x();
    let y = e.target.y();
    // if dropping near first point (and not the first itself), snap
    if (index !== 0 && newPoints.length > 0) {
      const first = newPoints[0];
      if (Math.hypot(x - first.x, y - first.y) <= SNAP_THRESHOLD) {
        x = first.x;
        y = first.y;
      }
    }
    newPoints[index] = { x, y };
    setPlotPoints(newPoints);
    setSnapHint(false);
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

  // Save / Load handlers
  const handleSaveJSON = () => {
    if (!isPlotFinished || !results) {
      toast.warning('সেভ করতে হলে আগে হিসাব সম্পন্ন করুন');
      return;
    }
    try {
      const data = { scale, plotPoints };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mouza-map-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('JSON সংরক্ষিত হয়েছে');
    } catch (err) {
      console.error('Save failed', err);
      toast.error('ডাটা সংরক্ষণ ব্যর্থ হয়েছে');
    }
  };

  const handleLoadClick = () => {
    if (!image) {
      toast.warning('JSON লোড করার আগে ম্যাপ আপলোড করুন');
      return;
    }
    if (loadInputRef.current) loadInputRef.current.click();
  };

  const handleLoadChange = (e) => {
    if (!image) {
      toast.warning('JSON লোড করার আগে ম্যাপ আপলোড করুন');
      if (e?.target) e.target.value = '';
      return;
    }
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || typeof obj !== 'object') throw new Error('Invalid file');
        if (!Array.isArray(obj.plotPoints) || obj.plotPoints.some(p => typeof p.x !== 'number' || typeof p.y !== 'number')) throw new Error('Invalid points');
        if (obj.scale && !(typeof obj.scale === 'number' && obj.scale > 0)) throw new Error('Invalid scale');
        if (obj.scale) setScale(obj.scale);
        setPlotPoints(obj.plotPoints);
        setIsPlotFinished(false);
        setResults(null);
        setMode('drawing_plot');
        setCalibrationLine([]);
        setSnapHint(false);
        toast.success('JSON লোড হয়েছে');
      } catch (err) {
        console.error('Load failed', err);
        toast.error('ডাটা লোড ব্যর্থ: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };


  const flatPlotPoints = plotPoints.flatMap(p => [p.x, p.y]);

  // Helpers for pinch-zoom
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const getMidpoint = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });
  const getDistance = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  const toLocalPointer = (client) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.container().getBoundingClientRect();
    return { x: client.x - rect.left, y: client.y - rect.top };
  };
  const zoomAtPoint = (newScale, clientPoint, anchorFrom = { scale: stageScale, pos: stagePos }) => {
    const oldScale = anchorFrom.scale;
    const pointer = toLocalPointer(clientPoint);
    const mousePointTo = {
      x: (pointer.x - anchorFrom.pos.x) / oldScale,
      y: (pointer.y - anchorFrom.pos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => { setCalibrationLine([]); setIsDrawing(false); setIsModalOpen(false); }} onSubmit={_handleModalSubmit} />
      <div className="p-4 md:p-8 print:hidden">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">মৌজা ম্যাপ ক্যালকুলেটর</h1>

          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1. ম্যাপ আপলোড করুন</label>
                <input type="file" onChange={handleImageUpload} accept=".pdf,.png,.jpg,.jpeg" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                {/* Save / Load JSON controls */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={handleSaveJSON} title={!isPlotFinished || !results ? 'Finish & Calculate the plot first' : undefined}>
                    JSON সংরক্ষণ করুন
                  </Button>
                  <Button onClick={handleLoadClick} variant="outline" title={!image ? 'Upload a map first' : undefined}>
                    JSON লোড করুন
                  </Button>
                  <input ref={loadInputRef} type="file" accept="application/json" className="hidden" onChange={handleLoadChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2. স্কেল সেট করুন</label>
                <Button onClick={() => { setMode('calibrating'); clearPlot(); setIsDrawing(false); setCalibrationLine([]); lastCalibClickRef.current = 0; }} disabled={!image || mode === 'calibrating'} className="w-full">
                  {mode === 'calibrating' ? 'স্কেল আঁকা হচ্ছে... (টেনে আনুন বা ২ বার ক্লিক করুন)' : 'স্কেল সেট করুন'}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">3. প্লট আঁকুন</label>
                <Button onClick={() => { setMode('drawing_plot'); clearPlot(); }} disabled={!scale || mode === 'drawing_plot'} className="w-full">
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
                  className="flex-grow"
                >
                  স্কেল নিশ্চিত করুন
                </Button>
                <Button
                  onClick={() => {
                    if (calibrationLine.length >= 4) {
                      // keep start point and allow re-drag
                      setCalibrationLine([calibrationLine[0], calibrationLine[1]]);
                      setIsDrawing(true);
                    }
                  }}
                  disabled={calibrationLine.length < 4}
                  variant="secondary"
                >
                  পূর্বাবস্থায় ফেরান
                </Button>
                <Button
                  onClick={() => { setCalibrationLine([]); setIsDrawing(false); setMode('none'); }}
                  variant="destructive"
                >
                  বাতিল
                </Button>
              </div>
            )}
            {mode === 'drawing_plot' && (
              <div className="flex gap-4 mt-4">
                <Button onClick={finishPlot} disabled={plotPoints.length < 3} className="flex-grow">শেষ করুন ও হিসাব করুন</Button>
                <Button onClick={() => setPlotPoints(p => p.slice(0, -1))} disabled={plotPoints.length === 0} variant="secondary">পূর্বাবস্থায় ফেরান</Button>
                <Button onClick={clearPlot} disabled={plotPoints.length === 0} variant="destructive">সাফ করুন</Button>
              </div>
            )}
          </div>

          {/* Removed redundant Re-calibrate alert; scale info is shown in the badge below and 'Change' handles re-calibration */}

          {/* Scale badge above canvas */}
          {scale && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="inline-block px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">1 ft ≈ {scale.toFixed(DECIMALS)} px</span>
              <Button variant="link" size="sm" onClick={() => { setMode('calibrating'); setCalibrationLine([]); setIsDrawing(false); }}>Change</Button>
            </div>
          )}

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
                } else if (mode === 'drawing_plot' && !isPlotFinished && plotPoints.length > 0) {
                  const stage = e.target.getStage();
                  const pos = getPointerPos(stage);
                  const first = plotPoints[0];
                  const SNAP_VISUAL_THRESHOLD = 5; // stage-space pixels
                  const near = Math.hypot(pos.x - first.x, pos.y - first.y) <= SNAP_VISUAL_THRESHOLD;
                  if (near !== snapHint) setSnapHint(near);
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
                } else if (mode === 'calibrating' && isDrawing) {
                  // Update live line for single-touch drag
                  const stage = e.target.getStage();
                  const pos = getPointerPos(stage);
                  setCalibrationLine((prev) => {
                    if (prev.length >= 2) return [prev[0], prev[1], pos.x, pos.y];
                    return prev;
                  });
                  // mark as moved to avoid treating as tap
                  if (touchSessionRef.current.active && touchSessionRef.current.single) {
                    const t = e.evt.touches[0];
                    const dx = t.clientX - touchSessionRef.current.startClient.x;
                    const dy = t.clientY - touchSessionRef.current.startClient.y;
                    if (Math.hypot(dx, dy) > 6) touchSessionRef.current.moved = true;
                  }
                } else if (mode === 'drawing_plot' && !isPlotFinished && plotPoints.length > 0 && touches && touches.length === 1) {
                  const stage = e.target.getStage();
                  const pos = getPointerPos(stage);
                  const first = plotPoints[0];
                  const SNAP_VISUAL_THRESHOLD = 5; // stage-space pixels
                  const near = Math.hypot(pos.x - first.x, pos.y - first.y) <= SNAP_VISUAL_THRESHOLD;
                  if (near !== snapHint) setSnapHint(near);
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
                    const stage = stageRef.current;
                    if (stage) {
                      const rect = stage.container().getBoundingClientRect();
                      const local = {
                        x: touchSessionRef.current.startClient.x - rect.left,
                        y: touchSessionRef.current.startClient.y - rect.top,
                      };
                      const pos = {
                        x: (local.x - stagePos.x) / stageScale,
                        y: (local.y - stagePos.y) / stageScale,
                      };
                      addPointerByPos(pos);
                    }
                  }
                  touchSessionRef.current.active = false;
                  setSnapHint(false);
                }
              }}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePos.x}
              y={stagePos.y}
              draggable={(mode === 'none' || isPlotFinished) && !isPinching}
              onDragEnd={(e) => setStagePos(e.target.position())}
            >
              <Layer>
                {image && <Image image={image} />}
                {calibrationLine.length > 0 && (
                  <>
                    <Line points={calibrationLine} stroke="#E53E3E" strokeWidth={3 / stageScale} dash={[10 / stageScale, 5 / stageScale]} />
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
                    stroke="#22c55e"
                    strokeWidth={3 / stageScale}
                    dash={[6 / stageScale, 4 / stageScale]}
                    shadowColor="#22c55e"
                    shadowBlur={10 / stageScale}
                    shadowOpacity={0.6}
                  />
                )}
                {plotPoints.length > 0 && <Line points={[...flatPlotPoints, ... (isPlotFinished ? [plotPoints[0].x, plotPoints[0].y] : [])]} stroke="#3182CE" strokeWidth={3 / stageScale} closed={isPlotFinished} />}
                {plotPoints.map((point, i) => (
                  <Circle
                    key={i}
                    x={point.x}
                    y={point.y}
                    radius={8 / stageScale}
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
