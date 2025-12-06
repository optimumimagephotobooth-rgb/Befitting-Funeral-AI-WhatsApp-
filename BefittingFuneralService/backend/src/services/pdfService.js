import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export function createPdfBuffer(title, metadata, body) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.fontSize(20).text(title, { underline: true });
    doc.moveDown();

    // Metadata section
    Object.entries(metadata || {}).forEach(([key, value]) => {
      doc.fontSize(10).fillColor('#555').text(`${key}: ${value}`);
    });

    doc.moveDown();

    // Body content
    doc.fontSize(12).fillColor('#000').text(body);

    doc.end();

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}


