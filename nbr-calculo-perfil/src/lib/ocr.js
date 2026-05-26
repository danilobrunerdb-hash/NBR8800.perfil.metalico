import Tesseract from 'tesseract.js';

export async function processFtoolImage(file, onProgress) {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (onProgress) {
          onProgress(m);
        }
      }
    });

    const text = result.data.text;
    console.log("OCR Extracted text:", text);
    
    // Expressão regular para achar números (incluindo decimais e negativos)
    const numberPattern = /-?\d+([.,]\d+)?/g;
    const matches = text.match(numberPattern);
    
    if (!matches) {
      return { Msd: null, Vsd: null };
    }

    // Limpar os matches, substituindo vírgula por ponto para parse
    const numbers = matches.map(m => parseFloat(m.replace(',', '.'))).filter(n => !isNaN(n));
    
    // No Ftool, frequentemente os maiores valores num diagrama são os esforços solicitantes.
    // Nós podemos sugerir os maiores valores absolutos encontrados.
    let maxAbsolute = 0;
    
    numbers.forEach(num => {
      const absNum = Math.abs(num);
      if (absNum > maxAbsolute) {
        maxAbsolute = absNum;
      }
    });

    // Como uma imagem pode ter ambos ou apenas um diagrama, 
    // sugerimos o valor máximo para que o usuário revise.
    // É uma heurística simples, já que o OCR perde a estrutura do diagrama.
    return { 
      suggestedValue: maxAbsolute > 0 ? maxAbsolute : null,
      rawNumbers: numbers
    };
    
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}
