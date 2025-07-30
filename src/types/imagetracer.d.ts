// Type definitions for imagetracer library
export interface TracingOptions {
  ltres?: number;
  qtres?: number;
  pathomit?: number;
  colorsampling?: number;
  numberofcolors?: number;
  mincolorratio?: number;
  colorquantcycles?: number;
}

export interface ImageTracerResult {
  svg: string;
}

declare module 'imagetracer' {
  export class ImageTracer {
    constructor();
    
    imageToSVG(
      imageUrl: string,
      callback: (svgString: string) => void,
      options?: TracingOptions | string
    ): void;
    
    imageDataToSVG(
      imageData: ImageData,
      options?: TracingOptions | string
    ): string;
    
    imageToTracedata(
      imageUrl: string,
      callback: (tracedata: any) => void,
      options?: TracingOptions | string
    ): void;
    
    imageDataToTracedata(
      imageData: ImageData,
      options?: TracingOptions | string
    ): any;
    
    appendSVGString(
      svgString: string,
      parentId: string
    ): void;
    
    loadImage(
      url: string,
      callback: (canvas: HTMLCanvasElement) => void
    ): void;
    
    getImgdata(
      canvas: HTMLCanvasElement
    ): ImageData;
  }

  export const OPTION_PRESETS: {
    [key: string]: TracingOptions;
  };
}