import { create } from 'zustand';
import { fabric } from 'fabric';

interface Adjustment {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  noise: number;
}

interface HistoryEntry {
  adjustments: Adjustment;
  imageData?: string;
  timestamp: number;
}

interface Preset {
  name: string;
  adjustments: Adjustment;
}

interface ImageState {
  canvas: fabric.Canvas | null;
  activeImage: fabric.Image | null;
  isDarkMode: boolean;
  isGrayscale: boolean;
  isSplitView: boolean;
  adjustments: Adjustment;
  history: HistoryEntry[];
  presets: Preset[];
  setCanvas: (canvas: fabric.Canvas) => void;
  setActiveImage: (image: fabric.Image | null) => void;
  toggleDarkMode: () => void;
  toggleGrayscale: () => void;
  toggleSplitView: () => void;
  updateAdjustment: (key: keyof Adjustment, value: number) => void;
  resetAdjustments: () => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  undo: () => void;
  addPreset: (preset: Preset) => void;
  applyPreset: (preset: Preset) => void;
  deletePreset: (presetName: string) => void;
  rotateImage: (angle: number) => void;
  cropImage: () => void;
  applyCrop: () => void;
  downloadImage: () => void;
}

const DEFAULT_ADJUSTMENTS: Adjustment = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  noise: 0,
};

export const DEFAULT_PRESETS: Preset[] = [
  {
    name: 'Vintage',
    adjustments: { brightness: -10, contrast: 10, saturation: -20, sharpness: 0, noise: 20 },
  },
  {
    name: 'Dramatic',
    adjustments: { brightness: -5, contrast: 30, saturation: 10, sharpness: 20, noise: 0 },
  },
  {
    name: 'Classic B&W',
    adjustments: { brightness: 0, contrast: 20, saturation: -100, sharpness: 10, noise: 0 },
  },
];

// Custom Sharpness Filter
fabric.Image.filters.Sharpness = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
  type: 'Sharpness',

  fragmentSource: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uSharpness;
    varying vec2 vTexCoord;
    void main() {
      vec2 texSize = vec2(1.0 / 512.0);
      vec4 color = texture2D(uTexture, vTexCoord);
      vec4 colorN = texture2D(uTexture, vTexCoord + vec2(0.0, -texSize.y));
      vec4 colorS = texture2D(uTexture, vTexCoord + vec2(0.0, texSize.y));
      vec4 colorE = texture2D(uTexture, vTexCoord + vec2(texSize.x, 0.0));
      vec4 colorW = texture2D(uTexture, vTexCoord + vec2(-texSize.x, 0.0));
      vec4 sum = colorN + colorS + colorE + colorW;
      gl_FragColor = color + (color - sum / 4.0) * uSharpness;
    }
  `,

  initialize: function(options: { sharpness?: number } = {}) {
    this.sharpness = options.sharpness || 0;
  },

  applyTo2d: function(options) {
    const imageData = options.imageData;
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const amount = this.sharpness / 50;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const idxN = ((y - 1) * width + x) * 4;
        const idxS = ((y + 1) * width + x) * 4;
        const idxE = (y * width + x + 1) * 4;
        const idxW = (y * width + x - 1) * 4;

        for (let c = 0; c < 3; c++) {
          const current = data[idx + c];
          const neighbors = (
            data[idxN + c] +
            data[idxS + c] +
            data[idxE + c] +
            data[idxW + c]
          ) / 4;
          
          data[idx + c] = Math.min(255, Math.max(0,
            current + (current - neighbors) * amount
          ));
        }
      }
    }
  },

  mainParameter: 'sharpness',

  getUniformLocations: function(gl: WebGLRenderingContext, program: WebGLProgram) {
    return {
      uSharpness: gl.getUniformLocation(program, 'uSharpness'),
    };
  },

  sendUniformData: function(gl: WebGLRenderingContext, uniformLocations: { [key: string]: WebGLUniformLocation }) {
    gl.uniform1f(uniformLocations.uSharpness, this.sharpness / 50);
  }
});

fabric.Image.filters.Sharpness.fromObject = fabric.Image.filters.BaseFilter.fromObject;

export const useImageStore = create<ImageState>((set, get) => ({
  canvas: null,
  activeImage: null,
  isDarkMode: false,
  isGrayscale: false,
  isSplitView: false,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  history: [],
  presets: [...DEFAULT_PRESETS],

  setCanvas: (canvas) => set({ canvas }),
  
  setActiveImage: (image) => set({ activeImage: image }),

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  toggleGrayscale: () => {
    const { canvas, activeImage, isGrayscale } = get();
    if (activeImage && canvas) {
      if (!isGrayscale) {
        activeImage.filters?.push(new fabric.Image.filters.Grayscale());
      } else {
        activeImage.filters = activeImage.filters?.filter(f => !(f instanceof fabric.Image.filters.Grayscale));
      }
      activeImage.applyFilters();
      canvas.renderAll();
      set({ isGrayscale: !isGrayscale });
    }
  },

  toggleSplitView: () => set((state) => ({ isSplitView: !state.isSplitView })),

  updateAdjustment: (key, value) => {
    const { canvas, activeImage } = get();
    if (activeImage && canvas) {
      set((state) => ({
        adjustments: { ...state.adjustments, [key]: value }
      }));
      
      // Apply filters based on adjustments
      activeImage.filters = [];
      const { adjustments, isGrayscale } = get();
      
      if (isGrayscale) {
        activeImage.filters.push(new fabric.Image.filters.Grayscale());
      }
      
      activeImage.filters.push(
        new fabric.Image.filters.Brightness({ brightness: adjustments.brightness / 100 }),
        new fabric.Image.filters.Contrast({ contrast: adjustments.contrast / 100 }),
        new fabric.Image.filters.Saturation({ saturation: adjustments.saturation / 100 }),
        new (fabric.Image.filters as any).Sharpness({ sharpness: adjustments.sharpness }),
        new fabric.Image.filters.Noise({ noise: adjustments.noise })
      );
      
      activeImage.applyFilters();
      canvas.renderAll();
      
      // Add to history
      get().addHistoryEntry({
        adjustments: { ...adjustments },
        timestamp: Date.now(),
      });
    }
  },

  resetAdjustments: () => {
    const { canvas, activeImage } = get();
    if (activeImage && canvas) {
      activeImage.filters = [];
      activeImage.applyFilters();
      canvas.renderAll();
      set({ adjustments: { ...DEFAULT_ADJUSTMENTS }, isGrayscale: false });
    }
  },

  addHistoryEntry: (entry) => {
    set((state) => ({
      history: [...state.history.slice(-19), entry]
    }));
  },

  undo: () => {
    const { history, canvas, activeImage } = get();
    if (history.length > 0 && activeImage && canvas) {
      const previousEntry = history[history.length - 2] || { adjustments: DEFAULT_ADJUSTMENTS };
      set({
        adjustments: { ...previousEntry.adjustments },
        history: history.slice(0, -1)
      });
      
      // Reapply filters
      get().updateAdjustment('brightness', previousEntry.adjustments.brightness);
    }
  },

  addPreset: (preset) => {
    set((state) => ({
      presets: [...state.presets, preset]
    }));
  },

  applyPreset: (preset) => {
    const { adjustments } = preset;
    Object.entries(adjustments).forEach(([key, value]) => {
      get().updateAdjustment(key as keyof Adjustment, value);
    });
  },

  deletePreset: (presetName) => {
    set((state) => ({
      presets: state.presets.filter(p => p.name !== presetName)
    }));
  },

  rotateImage: (angle) => {
    const { canvas, activeImage } = get();
    if (activeImage && canvas) {
      activeImage.rotate((activeImage.angle || 0) + angle);
      canvas.renderAll();
    }
  },

  cropImage: () => {
    const { canvas, activeImage } = get();
    if (activeImage && canvas) {
      // Remove any existing crop rectangle
      const objects = canvas.getObjects();
      objects.forEach(obj => {
        if (obj !== activeImage) {
          canvas.remove(obj);
        }
      });

      const cropRect = new fabric.Rect({
        left: activeImage.left,
        top: activeImage.top,
        width: activeImage.width! * activeImage.scaleX!,
        height: activeImage.height! * activeImage.scaleY!,
        fill: 'transparent',
        stroke: '#00ff00',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        originX: 'left',
        originY: 'top',
        hasRotatingPoint: false,
      });

      canvas.add(cropRect);
      canvas.setActiveObject(cropRect);
      canvas.renderAll();
    }
  },

  applyCrop: () => {
    const { canvas, activeImage } = get();
    if (!canvas || !activeImage) return;

    const objects = canvas.getObjects();
    const cropRect = objects.find(obj => obj instanceof fabric.Rect);
    
    if (!cropRect) return;

    // Create a temporary canvas for cropping
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    if (!tempContext) return;

    // Set temporary canvas size to match the crop rectangle
    tempCanvas.width = cropRect.width! * cropRect.scaleX!;
    tempCanvas.height = cropRect.height! * cropRect.scaleY!;

    // Draw the image onto the temporary canvas
    const img = activeImage.getElement() as HTMLImageElement;
    
    // Calculate crop coordinates
    const zoom = canvas.getZoom();
    const left = (cropRect.left! - activeImage.left!) / activeImage.scaleX!;
    const top = (cropRect.top! - activeImage.top!) / activeImage.scaleY!;
    
    tempContext.drawImage(
      img,
      left,
      top,
      cropRect.width! / activeImage.scaleX!,
      cropRect.height! / activeImage.scaleY!,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    // Create new image from cropped canvas
    fabric.Image.fromURL(tempCanvas.toDataURL(), (croppedImg) => {
      // Remove old image and crop rectangle
      canvas.remove(activeImage);
      canvas.remove(cropRect);

      // Add new cropped image
      croppedImg.set({
        left: cropRect.left,
        top: cropRect.top,
        scaleX: 1,
        scaleY: 1
      });

      canvas.add(croppedImg);
      canvas.setActiveObject(croppedImg);
      set({ activeImage: croppedImg });
      canvas.renderAll();
    });
  },

  downloadImage: () => {
    const { canvas } = get();
    if (canvas) {
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
      });
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = dataURL;
      link.click();
    }
  },
}));