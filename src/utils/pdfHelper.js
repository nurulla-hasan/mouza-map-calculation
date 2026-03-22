import * as pdfjs from 'pdfjs-dist';

// Setup PDF.js worker (Vite-friendly)
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export const extractImageFromPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
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
        img.onload = () => {
          resolve(img);
        };
        img.onerror = (err) => {
          reject(err);
        };
      } catch (error) {
        console.error("Error processing PDF:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};
