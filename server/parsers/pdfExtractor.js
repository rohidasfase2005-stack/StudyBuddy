import fs from 'fs';
import pdf from 'pdf-parse';

export async function extractTextFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('Empty PDF or no extractable text found.');
    }
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info
    };
  } catch (error) {
    if (error.name === 'PasswordException' || error.message.toLowerCase().includes('password')) {
      throw new Error('Password-protected PDFs are not supported.');
    }
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

export async function extractTextByPage(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pages = [];
    let currentPage = 1;

    // Custom pagerender to capture text per page
    const render_page = async function(pageData) {
      const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      const textContent = await pageData.getTextContent(render_options);
      let text = '';
      let lastY;
      for (const item of textContent.items) {
        if (lastY == item.transform[5] || !lastY){
            text += item.str;
        }  
        else{
            text += '\n' + item.str;
        }    
        lastY = item.transform[5];
      }
      
      pages.push({
        pageNumber: currentPage++,
        text: text
      });
      return text;
    };

    const options = {
      pagerender: render_page
    };

    await pdf(dataBuffer, options);
    return pages;
  } catch (error) {
    throw new Error(`Failed to extract text by page: ${error.message}`);
  }
}
