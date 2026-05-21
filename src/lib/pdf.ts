/**
 * PDF to Image Conversion Utility
 *
 * Uses pdfjs-dist to convert PDF pages to images for OCR processing.
 * Cloudflare Workers AI Vision models do not support PDF directly,
 * so we convert PDF pages to PNG images before OCR extraction.
 */

// Use dynamic import to avoid SSR issues with Next.js
let pdfjsLib: typeof import("pdfjs-dist") | null = null;
let isInitialized = false;

/**
 * Initialize pdfjs library (client-side only)
 */
async function initPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (pdfjsLib && isInitialized) {
    return pdfjsLib;
  }

  // Dynamic import for client-side only
  const pdfjs = await import("pdfjs-dist");
  pdfjsLib = pdfjs;

  // Configure worker - only in browser
  if (typeof window !== "undefined") {
    // Use CDN for worker script
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }

  isInitialized = true;
  return pdfjs;
}

/**
 * Convert the first page of a PDF file to a PNG image.
 *
 * @param pdfFile - The PDF File object to convert
 * @param scale - Resolution scale (default 2.0 for high quality)
 * @returns Promise<File> - The converted PNG image as a File object
 */
export async function convertPdfToImage(
  pdfFile: File,
  scale: number = 2.0
): Promise<File> {
  console.log("[PDF] Converting PDF to image:", pdfFile.name);

  // Validate file type
  if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("File is not a PDF");
  }

  try {
    // Initialize pdfjs
    const pdfjs = await initPdfJs();

    // Read the PDF file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    console.log("[PDF] PDF loaded, page count:", pdf.numPages);

    // Check if PDF has pages
    if (pdf.numPages === 0) {
      throw new Error("PDF is empty (no pages)");
    }

    // Get the first page
    const page = await pdf.getPage(1);

    // Calculate viewport with scale for higher resolution
    const viewport = page.getViewport({ scale });

    // Create canvas (browser only)
    if (typeof document === "undefined") {
      throw new Error("PDF conversion requires browser environment");
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to get canvas context");
    }

    // Set canvas dimensions
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // Set white background (PDFs can have transparent backgrounds)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render PDF page to canvas
    const renderTask = page.render({
      canvasContext: context,
      viewport: viewport,
    });

    await renderTask.promise;

    console.log("[PDF] Page rendered to canvas, converting to blob");

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        },
        "image/png",
        1.0
      );
    });

    // Create new filename with PNG extension
    const originalName = pdfFile.name.replace(/\.pdf$/i, "");
    const newFileName = `${originalName}_page1.png`;

    // Create File object from blob
    const imageFile = new File([blob], newFileName, {
      type: "image/png",
      lastModified: Date.now(),
    });

    console.log("[PDF] Conversion successful:", newFileName);

    // Cleanup
    page.cleanup();
    pdf.destroy();

    return imageFile;
  } catch (error) {
    console.error("[PDF] Conversion failed:", error);
    throw error;
  }
}

/**
 * Check if a file is a PDF based on its type or filename.
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Validate PDF file before processing.
 */
export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!isPdfFile(file)) {
    return { valid: false, error: "File bukan PDF" };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: "File PDF terlalu besar. Maks 10 MB." };
  }

  // Check file size (min 1KB - very small PDFs are likely corrupted)
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return { valid: false, error: "File PDF terlalu kecil atau corrupted" };
  }

  return { valid: true };
}