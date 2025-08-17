import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarReferencia(livroNome: string, capitulo: number, versiculo?: number): string {
  if (versiculo) {
    return `${livroNome} ${capitulo}:${versiculo}`;
  }
  return `${livroNome} ${capitulo}`;
}

export function formatarData(data: string): string {
  const date = new Date(data);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatarDataRelativa(data: string): string {
  const agora = new Date();
  const dataObj = new Date(data);
  const diffMs = agora.getTime() - dataObj.getTime();
  const diffMinutos = Math.floor(diffMs / (1000 * 60));
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutos < 1) {
    return 'Agora mesmo';
  } else if (diffMinutos < 60) {
    return `${diffMinutos} minuto${diffMinutos > 1 ? 's' : ''} atrás`;
  } else if (diffHoras < 24) {
    return `${diffHoras} hora${diffHoras > 1 ? 's' : ''} atrás`;
  } else if (diffDias < 7) {
    return `${diffDias} dia${diffDias > 1 ? 's' : ''} atrás`;
  } else {
    return formatarData(data);
  }
}

export function destacarTexto(texto: string, termo: string): string {
  if (!termo) return texto;
  
  const regex = new RegExp(`(${termo})`, 'gi');
  return texto.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
}

export function truncarTexto(texto: string, limite = 100): string {
  if (texto.length <= limite) return texto;
  return texto.substring(0, limite) + '...';
}

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

export function gerarIdUnico(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function copiarParaClipboard(texto: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto)
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } else {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = texto;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        resolve(success);
      } catch (error) {
        document.body.removeChild(textArea);
        resolve(false);
      }
    }
  });
}

export function formatarNumero(numero: number): string {
  return numero.toLocaleString('pt-BR');
}

export function gerarCor(texto: string): string {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function scrollSuave(elemento: HTMLElement, posicao = 0): void {
  elemento.scrollTo({
    top: posicao,
    behavior: 'smooth'
  });
}

export function isElementoVisivel(elemento: HTMLElement): boolean {
  const rect = elemento.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}