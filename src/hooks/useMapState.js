import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { calculatePolygonData, DECIMALS } from '@/utils/mapCalculations';
import { extractImageFromPDF } from '@/utils/pdfHelper';

export const useMapState = () => {
  const [image, setImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
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
  const TAP_GRACE_MS = 200;
  const TAP_MIN_MS = 50;
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
  const [manualScale, setManualScale] = useState('');
  const [showManualScale, setShowManualScale] = useState(false);
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

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  const resetState = (fullReset = true) => {
    if (fullReset) setImage(null);
    if (fullReset) setScale(null);
    setManualScale('');
    setShowManualScale(false);
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

  useEffect(() => {
    const savedScale = localStorage.getItem('mapScale');
    if (savedScale) {
      setScale(parseFloat(savedScale));
    }
    const savedPlot = localStorage.getItem('mapPlotPoints');
    if (savedPlot) {
      try {
        const parsed = JSON.parse(savedPlot);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlotPoints(parsed);
          setMode('drawing_plot');
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Auto-save plot points
  useEffect(() => {
    if (plotPoints.length > 0) {
      localStorage.setItem('mapPlotPoints', JSON.stringify(plotPoints));
    } else {
      localStorage.removeItem('mapPlotPoints');
    }
  }, [plotPoints]);

  const handleManualScaleSubmit = (e) => {
    e.preventDefault();
    const ftPerPx = parseFloat(manualScale); // User inputs ft per px (e.g. 0.43)
    if (!isNaN(ftPerPx) && ftPerPx > 0) {
      const scaleValue = 1 / ftPerPx; // Convert to internal scale (px/ft)
      setScale(scaleValue);
      localStorage.setItem('mapScale', scaleValue.toString());
      toast.success(`স্কেল সেট করা হয়েছে: 1 px = ${ftPerPx.toFixed(6)} ft`);
      setMode('none');
      setShowManualScale(false);
    } else {
      toast.error('দয়া করে ০ এর চেয়ে বড় একটি সংখ্যা লিখুন');
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setImage(null);
    setImageName('');
    const fileInput = document.getElementById('map-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    if (file.type === "application/pdf") {
      setImageName(file.name || 'document.pdf');
      try {
        const img = await extractImageFromPDF(file);
        resetState(false);
        setImage(img);
      } catch (error) {
        toast.error('PDF লোড করা যায়নি (ফাইলটি ক্ষতিগ্রস্ত বা অবৈধ হতে পারে)');
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => { resetState(false); setImageName(file.name || 'image'); setImage(img); };
      };
      reader.readAsDataURL(file);
    }
  };

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

  const getStageCenterPoint = () => {
    const cx = stageSize.width / 2;
    const cy = stageSize.height / 2;
    return { x: (cx - stagePos.x) / stageScale, y: (cy - stagePos.y) / stageScale };
  };

  const addCenterPoint = () => {
    const pt = getStageCenterPoint();
    if (mode === 'calibrating') {
      if (calibrationLine.length < 2) {
        setCalibrationLine([pt.x, pt.y]);
        setIsDrawing(true);
      } else {
        const [x1, y1] = calibrationLine;
        const x2 = pt.x;
        const y2 = pt.y;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 1e-3) return;
        setCalibrationLine([x1, y1, x2, y2]);
        setIsDrawing(false);
      }
    } else if (mode === 'drawing_plot' && !isPlotFinished) {
      const SNAP_THRESHOLD = 5;
      if (plotPoints.length >= 3) {
        const first = plotPoints[0];
        if (Math.hypot(pt.x - first.x, pt.y - first.y) <= SNAP_THRESHOLD) {
          finishPlot();
          setSnapHint(false);
          return;
        }
      }
      setPlotPoints((prev) => [...prev, pt]);
      setSnapHint(false);
    }
  };

  const handleStageMouseDown = (e) => {
    return;
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
    wheelAccumRef.current += e.evt.deltaY;
    if (!wheelRafRef.current) {
      wheelRafRef.current = requestAnimationFrame(() => {
        wheelRafRef.current = 0;
        const delta = wheelAccumRef.current;
        wheelAccumRef.current = 0;
        const factor = Math.pow(1.0015, -delta);
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
    
    // Calculate newScale (px/ft) directly, but log dynamic PPI for exactness
    // newScale = pixelDistance / realDistance
    const newScale = pixelDistance / realDistance;
    
    setScale(newScale);
    try {
      localStorage.setItem('mapScale', newScale.toString());
    } catch (e) {
      // ignore storage errors
    }
    setIsModalOpen(false);
    setCalibrationLine([]);
    toast.success(`স্কেল সেট হয়েছে (1 px = ${(1/newScale).toFixed(6)} ft)`);
  };

  const handlePointDragEnd = (e, index) => {
    const SNAP_THRESHOLD = 5;
    const newPoints = [...plotPoints];
    let x = e.target.x();
    let y = e.target.y();
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
    setTimeout(() => {
      if (stageRef.current) {
        setReportImage(stageRef.current.toDataURL({ pixelRatio: 2 }));
      }
    }, 100);
  };

  const clearPlot = () => {
    setPlotPoints([]);
    setResults(null);
    setIsPlotFinished(false);
    setReportImage(null);
  };

  const handlePrint = () => {
    window.print();
  };

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

  return {
    image, setImage,
    selectedFile, setSelectedFile,
    containerRef, stageRef, printRef, loadInputRef, resultsRef,
    stageSize, setStageSize,
    lastCalibClickRef, isPinchingRef, lastPinchDistRef, pinchStartRef, pinchRafRef, blockTapRef, pinchLastStartRef, touchSessionRef, wheelRafRef, wheelAccumRef,
    TAP_GRACE_MS, TAP_MIN_MS,
    mode, setMode,
    isModalOpen, setIsModalOpen,
    stagePos, setStagePos,
    stageScale, setStageScale,
    isPinching, setIsPinching,
    scale, setScale,
    manualScale, setManualScale,
    showManualScale, setShowManualScale,
    calibrationLine, setCalibrationLine,
    isDrawing, setIsDrawing,
    plotPoints, setPlotPoints,
    results, setResults,
    isPlotFinished, setIsPlotFinished,
    reportImage, setReportImage,
    snapHint, setSnapHint,
    imageName, setImageName,
    
    // Actions
    resetState,
    handleManualScaleSubmit,
    handleClearFile,
    handleImageUpload,
    getStageCenterPoint,
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
    clamp, getMidpoint, getDistance, toLocalPointer, zoomAtPoint,
    flatPlotPoints,
  };
};
