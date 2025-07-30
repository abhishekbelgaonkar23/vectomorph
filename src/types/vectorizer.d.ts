declare module 'vectorizer' {
  export function vectorize(
    imageData: ImageData,
    options?: {
      color?: string;
      background?: string;
      turdSize?: number;
      turnPolicy?: string;
      [key: string]: any;
    }
  ): string;
} 