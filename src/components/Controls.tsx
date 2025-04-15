import React, { useState } from 'react';
import { 
  Moon, Sun, Undo2, RotateCcw, RotateCw, Crop, Download, 
  Split, Image as ImageIcon, Save, Trash2, Check
} from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { DEFAULT_PRESETS } from '../store/imageStore';

const AdjustmentSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <input
      type="range"
      min="-100"
      max="100"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
    <span className="text-xs text-gray-500 dark:text-gray-400">{value}</span>
  </div>
);

const PresetSelector: React.FC = () => {
  const [newPresetName, setNewPresetName] = useState('');
  const { presets, addPreset, applyPreset, deletePreset, adjustments } = useImageStore();

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      addPreset({
        name: newPresetName,
        adjustments: { ...adjustments }
      });
      setNewPresetName('');
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Presets</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          placeholder="New preset name"
          className="flex-1 px-2 py-1 text-sm border rounded"
        />
        <button
          onClick={handleSavePreset}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Save preset"
        >
          <Save size={16} />
        </button>
      </div>
      <div className="space-y-1">
        {presets.map((preset) => (
          <div key={preset.name} className="flex items-center justify-between">
            <button
              onClick={() => applyPreset(preset)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {preset.name}
            </button>
            {!DEFAULT_PRESETS.find(p => p.name === preset.name) && (
              <button
                onClick={() => deletePreset(preset.name)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Delete preset"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Controls: React.FC = () => {
  const [isCropping, setIsCropping] = useState(false);
  const {
    adjustments,
    updateAdjustment,
    resetAdjustments,
    isDarkMode,
    toggleDarkMode,
    isGrayscale,
    toggleGrayscale,
    isSplitView,
    toggleSplitView,
    rotateImage,
    cropImage,
    applyCrop,
    downloadImage,
    undo,
  } = useImageStore();

  const handleCropClick = () => {
    if (!isCropping) {
      cropImage();
      setIsCropping(true);
    } else {
      applyCrop();
      setIsCropping(false);
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Adjustments
        </h2>
        <div className="flex gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={undo}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Undo"
          >
            <Undo2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => rotateImage(-90)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Rotate left"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={() => rotateImage(90)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Rotate right"
        >
          <RotateCw size={20} />
        </button>
        <button
          onClick={handleCropClick}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isCropping ? 'bg-green-100 dark:bg-green-900' : ''
          }`}
          title={isCropping ? "Apply crop" : "Crop"}
        >
          {isCropping ? <Check size={20} /> : <Crop size={20} />}
        </button>
        <button
          onClick={toggleSplitView}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isSplitView ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Split view"
        >
          <Split size={20} />
        </button>
        <button
          onClick={toggleGrayscale}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isGrayscale ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Convert to grayscale"
        >
          <ImageIcon size={20} />
        </button>
        <button
          onClick={downloadImage}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Download image"
        >
          <Download size={20} />
        </button>
      </div>

      <PresetSelector />

      <div className="space-y-4">
        <AdjustmentSlider
          label="Brightness"
          value={adjustments.brightness}
          onChange={(value) => updateAdjustment('brightness', value)}
        />
        <AdjustmentSlider
          label="Contrast"
          value={adjustments.contrast}
          onChange={(value) => updateAdjustment('contrast', value)}
        />
        <AdjustmentSlider
          label="Saturation"
          value={adjustments.saturation}
          onChange={(value) => updateAdjustment('saturation', value)}
        />
        <AdjustmentSlider
          label="Sharpness"
          value={adjustments.sharpness}
          onChange={(value) => updateAdjustment('sharpness', value)}
        />
        <AdjustmentSlider
          label="Noise Reduction"
          value={adjustments.noise}
          onChange={(value) => updateAdjustment('noise', value)}
        />
      </div>

      <button
        onClick={resetAdjustments}
        className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        Reset All
      </button>
    </div>
  );
};