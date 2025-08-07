
// These are loaded from index.html via CDN
declare const pdfjsLib: any;
declare const mammoth: any;

// Set up the worker for pdf.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

export const extractText = async (file: File): Promise<string> => {
  const fileType = file.type;
  const arrayBuffer = await file.arrayBuffer();

  if (fileType === 'application/pdf') {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      return fullText.trim();
    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("Could not read text from the PDF file. It might be an image-based PDF or corrupted.");
    }
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
    try {
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        return result.value;
    } catch (error) {
        console.error("Error parsing DOCX:", error);
        throw new Error("Could not read text from the DOCX file. The file might be corrupted or password-protected.");
    }
  } else {
    throw new Error(`Unsupported file type: ${file.name}. Please upload a PDF or DOCX file.`);
  }
};