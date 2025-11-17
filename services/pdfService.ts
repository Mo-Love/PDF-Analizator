
// This tells TypeScript that pdfjsLib is available globally,
// as it's loaded from a CDN in index.html.
declare const pdfjsLib: any;

/**
 * Extracts text content from all pages of a given PDF file.
 * @param file The PDF file to process.
 * @returns A promise that resolves with the full text content of the PDF.
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error('Не вдалося прочитати файл.'));
      }

      try {
        const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }

        resolve(fullText.trim());
      } catch (error) {
        console.error('Помилка обробки PDF:', error);
        if (error instanceof Error && 'name' in error && error.name === 'PasswordException') {
            reject(new Error('PDF захищено паролем і не може бути оброблено.'));
        } else {
            reject(new Error('Не вдалося обробити PDF файл.'));
        }
      }
    };

    fileReader.onerror = () => {
      reject(new Error('Сталася помилка при читанні файлу.'));
    };

    fileReader.readAsArrayBuffer(file);
  });
};
