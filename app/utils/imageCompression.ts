/**
 * Utilitário de compressão de imagens para reduzir Egress do Supabase.
 * FASE 3A - Otimização Segura.
 */

export async function compressImageBeforeBase64(
  input: File | string,
  maxWidth: number = 1280,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new window.Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcula proporção se a largura exceder o máximo
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback se não suportar canvas 2d
          if (typeof input === 'string') resolve(input);
          else {
            const fallbackReader = new FileReader();
            fallbackReader.onloadend = () => resolve(fallbackReader.result as string);
            fallbackReader.readAsDataURL(input);
          }
          return;
        }

        // Desenha a imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta comprimida
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

        // Validação - Logs Temporários
        const getBase64Size = (b64: string) => Math.round((b64.length * (3 / 4)) / 1024); // KB
        
        // Pega tamanho original
        let originalSizeKb = 0;
        if (typeof input === 'string') {
          originalSizeKb = getBase64Size(input);
        } else {
          originalSizeKb = Math.round(input.size / 1024);
        }

        const finalSizeKb = getBase64Size(compressedBase64);
        const reduction = originalSizeKb > 0 ? Math.round(((originalSizeKb - finalSizeKb) / originalSizeKb) * 100) : 0;

        console.log(`[Compression] Imagem Original: ${originalSizeKb} KB`);
        console.log(`[Compression] Imagem Final: ${finalSizeKb} KB`);
        console.log(`[Compression] Redução: ${reduction}%`);

        resolve(compressedBase64);
      };

      img.onerror = (err) => {
        console.error('[Compression] Erro ao carregar imagem', err);
        reject(err);
      };

      // Se for File, converte para base64 inicial para o src do Image
      if (typeof input === 'string') {
        img.src = input;
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(input);
      }
    } catch (error) {
      console.error('[Compression] Falha crítica', error);
      reject(error);
    }
  });
}
