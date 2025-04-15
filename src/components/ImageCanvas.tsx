import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useImageStore } from '../store/imageStore';
import { Upload } from 'lucide-react';

export const ImageCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<fabric.Image | null>(null);
  const { setCanvas, setActiveImage, isSplitView } = useImageStore();

  useEffect(() => {
    if (canvasRef.current && wrapperRef.current) {
      const wrapper = wrapperRef.current;
      const width = wrapper.clientWidth;
      const height = Math.min(600, window.innerHeight - 200);

      // Create new Fabric canvas
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#f0f0f0',
        preserveObjectStacking: true,
      });

      fabricCanvasRef.current = fabricCanvas;
      setCanvas(fabricCanvas);

      const handleResize = () => {
        const newWidth = wrapper.clientWidth;
        fabricCanvas.setWidth(newWidth);
        fabricCanvas.setHeight(height);
        fabricCanvas.renderAll();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        fabricCanvas.dispose();
      };
    }
  }, [setCanvas]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas && originalImageRef.current) {
      if (isSplitView) {
        // Create split view effect
        const originalImage = originalImageRef.current;
        const clonedImage = fabric.util.object.clone(originalImage);
        
        originalImage.clipPath = new fabric.Rect({
          left: -originalImage.width! / 2,
          top: -originalImage.height! / 2,
          width: originalImage.width! / 2,
          height: originalImage.height!,
          absolutePositioned: true,
        });
        
        clonedImage.clipPath = new fabric.Rect({
          left: 0,
          top: -clonedImage.height! / 2,
          width: clonedImage.width! / 2,
          height: clonedImage.height!,
          absolutePositioned: true,
        });
        
        canvas.add(clonedImage);
        canvas.renderAll();
      } else {
        // Remove split view
        const objects = canvas.getObjects();
        if (objects.length > 1) {
          canvas.remove(objects[1]);
        }
        originalImageRef.current.clipPath = null;
        canvas.renderAll();
      }
    }
  }, [isSplitView]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && fabricCanvasRef.current) {
      loadImage(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && fabricCanvasRef.current) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const canvas = fabricCanvasRef.current;
      if (e.target?.result && canvas) {
        fabric.Image.fromURL(e.target.result as string, (img) => {
          canvas.clear();
          
          // Scale image to fit canvas while maintaining aspect ratio
          const canvasWidth = canvas.width || 800;
          const canvasHeight = canvas.height || 600;
          const scale = Math.min(
            canvasWidth / img.width!,
            canvasHeight / img.height!
          ) * 0.9; // 90% of max size to leave some padding
          
          img.scale(scale);
          img.set({
            left: (canvasWidth - img.width! * scale) / 2,
            top: (canvasHeight - img.height! * scale) / 2,
            selectable: true,
            hasControls: true,
          });
          
          originalImageRef.current = img;
          setActiveImage(img);
          canvas.add(img);
          canvas.renderAll();
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      ref={wrapperRef}
      className="relative w-full h-full min-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {!fabricCanvasRef.current?.getObjects().length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <label 
            className="flex flex-col items-center justify-center gap-4 cursor-pointer pointer-events-auto"
            htmlFor="imageUpload"
          >
            <Upload size={48} className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">
              Drop an image or click to upload
            </span>
            <input
              type="file"
              id="imageUpload"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}
    </div>
  );
};