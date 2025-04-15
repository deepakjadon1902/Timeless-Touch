import React, { useEffect } from 'react';
import { ImageCanvas } from './components/ImageCanvas';
import { Controls } from './components/Controls';
import { useImageStore } from './store/imageStore';

function App() {
  const isDarkMode = useImageStore((state) => state.isDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Image Restoration & Colorization
        </h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <ImageCanvas />
          </div>
          <Controls />
        </div>
      </div>
    </div>
  );
}

export default App;