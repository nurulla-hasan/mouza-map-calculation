// Constants for exact precision based on "16 inch = 1 mile" scale
export const MILE_IN_FEET = 5280;
export const MAP_INCHES_PER_MILE = 16;
export const FEET_PER_MAP_INCH = MILE_IN_FEET / MAP_INCHES_PER_MILE; // Exact: 330
export const SHOTOK_SQ_FT = 435.6;
export const KATHA_SQ_FT = 720;
export const DECIMALS = 6; // High precision for output display

/**
 * 1. Dynamic PPI (Pixel Per Inch) Calculation
 * If user draws a line of `pixelDistance` and says it is `actualDistanceFeet` feet,
 * we dynamically calculate the Map's PPI.
 */
export const calculateDynamicPPI = (pixelDistance, actualDistanceFeet) => {
  if (!pixelDistance || !actualDistanceFeet) return 0;
  // PPI = Pixels per Map Inch
  // Since 1 Map Inch = 330 feet, then actualDistanceFeet = (actualDistanceFeet / 330) Map Inches
  // So, PPI = pixelDistance / (actualDistanceFeet / 330)
  return (pixelDistance * FEET_PER_MAP_INCH) / actualDistanceFeet;
};

/**
 * 2. High Precision Unit Conversions (px ↔ ft, px ↔ mile, px ↔ inch)
 * Note: All internal calculations are based on feet to reduce floating point errors.
 */

// Convert Pixels to Feet
export const pxToFt = (px, ppi) => {
  if (!ppi) return 0;
  return px * (FEET_PER_MAP_INCH / ppi);
};

// Convert Feet to Pixels
export const ftToPx = (ft, ppi) => {
  if (!ppi) return 0;
  return ft * (ppi / FEET_PER_MAP_INCH);
};

// Convert Pixels to Miles (Ground Distance)
export const pxToMile = (px, ppi) => {
  return pxToFt(px, ppi) / MILE_IN_FEET;
};

// Convert Pixels to Map Inches (Physical Map Distance)
export const pxToMapInch = (px, ppi) => {
  if (!ppi) return 0;
  return px / ppi;
};

/**
 * 3. Calculate Polygon Data using High Precision
 * No rounding in intermediate steps. Rounding is only applied to output values.
 */
export const calculatePolygonData = (points, scale) => {
  if (points.length < 3 || !scale) return null;

  // scale here is traditionally (pixels / feet). 
  // It is exactly equivalent to (PPI / 330).
  // 1 foot = `scale` pixels. So 1 pixel = `1 / scale` feet.

  const lengths = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    // Pixel distance between two points
    const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    
    // Convert directly to feet (internal base unit) without rounding
    const distFt = pixelDist / scale; 
    lengths.push(distFt);
  }

  // Calculate pixel area using Shoelace formula
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += (p1.x * p2.y - p2.x * p1.y);
  }
  const pixelArea = Math.abs(area / 2);
  
  // Convert pixel area to square feet (since scale = px/ft, scale^2 = px^2 / ft^2)
  // sqft = px^2 / (px^2 / ft^2)
  const sqft = pixelArea / (scale * scale);

  return {
    sqft: sqft,
    shotok: sqft / SHOTOK_SQ_FT,
    katha: sqft / KATHA_SQ_FT,
    lengths: lengths, // exact lengths in feet
  };
};

/**
 * 4. Safe Formatting Function for UI (Applies rounding ONLY at output)
 */
export const formatPrecision = (value, decimals = DECIMALS) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  // toFixed returns string, we parse it back to number to strip trailing zeros if needed
  // but for exact display, returning the fixed string is best.
  return Number(value.toFixed(decimals));
};
