import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Convert multiple image files (PNG, JPG, WebP) into a single PDF document.
 */
export async function imagesToPdf(imageFiles: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of imageFiles) {
    const arrayBuffer = await file.arrayBuffer();
    let image;

    if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else {
      // JPG or convert WebP via canvas to JPG
      try {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } catch (e) {
        // Fallback for WebP or other formats: convert to PNG via Canvas
        const dataUrl = await fileToDataUrl(file);
        const pngBuffer = await canvasImageToBuffer(dataUrl, 'image/png');
        image = await pdfDoc.embedPng(pngBuffer);
      }
    }

    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await pdfDoc.save();
}

/**
 * Merge multiple PDF files into one combined PDF.
 */
export async function mergePdfs(pdfFiles: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of pdfFiles) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Remove specific pages from a PDF.
 * @param pageIndicesToRemove 1-indexed page numbers (e.g. [1, 3])
 */
export async function removePdfPages(pdfFile: File, pageIndicesToRemove: number[]): Promise<Uint8Array> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  // Convert 1-indexed to 0-indexed and sort descending to avoid index shifting
  const zeroIndexed = pageIndicesToRemove
    .map(p => p - 1)
    .filter(idx => idx >= 0 && idx < totalPages)
    .sort((a, b) => b - a);

  // Remove pages
  for (const idx of zeroIndexed) {
    pdfDoc.removePage(idx);
  }

  return await pdfDoc.save();
}

/**
 * Convert Document / Text to PDF.
 */
export async function textToPdf(title: string, text: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Title
  page.drawText(title || 'Document', {
    x: margin,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 35;

  const lines = text.split('\n');
  const fontSize = 11;
  const lineHeight = 16;

  for (const line of lines) {
    if (y < margin + 40) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }

    // Wrap long lines
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > width - margin * 2) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= lineHeight;
    }
  }

  return await pdfDoc.save();
}

/**
 * Convert Image format (e.g. WebP/PNG -> JPEG, or PNG -> WebP)
 */
export async function convertImageFormat(file: File, targetMime: string): Promise<Blob> {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));

      // If converting to JPEG, draw white background
      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Conversion to blob failed'));
      }, targetMime, 0.92);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function canvasImageToBuffer(dataUrl: string, mime: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          resolve(await blob.arrayBuffer());
        } else {
          reject(new Error('Blob conversion failed'));
        }
      }, mime);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
