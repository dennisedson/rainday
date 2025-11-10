import React, { useState, useEffect } from 'react';

/**
 * Slider component (S) - Dual-handle range slider for price filtering
 * Used for filtering products by price range
 */
const Slider = ({
  min = 0,
  max = 500,
  step = 1,
  minValue: initialMinValue = 0,
  maxValue: initialMaxValue = 500,
  onChange,
  className = '',
  formatLabel = (value) => `$${value}`,
}) => {
  const [minValue, setMinValue] = useState(initialMinValue);
  const [maxValue, setMaxValue] = useState(initialMaxValue);

  useEffect(() => {
    setMinValue(initialMinValue);
    setMaxValue(initialMaxValue);
  }, [initialMinValue, initialMaxValue]);

  const handleMinChange = (e) => {
    const value = Math.min(Number(e.target.value), maxValue - step);
    setMinValue(value);
    if (onChange) {
      onChange({ min: value, max: maxValue });
    }
  };

  const handleMaxChange = (e) => {
    const value = Math.max(Number(e.target.value), minValue + step);
    setMaxValue(value);
    if (onChange) {
      onChange({ min: minValue, max: value });
    }
  };

  // Calculate positions for the range visualization
  const minPercent = ((minValue - min) / (max - min)) * 100;
  const maxPercent = ((maxValue - min) / (max - min)) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Labels */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-gray-700">
          {formatLabel(minValue)}
        </span>
        <span className="text-sm text-gray-500">to</span>
        <span className="text-sm font-medium text-gray-700">
          {formatLabel(maxValue)}
        </span>
      </div>

      {/* Slider Container */}
      <div className="relative h-2">
        {/* Track */}
        <div className="absolute w-full h-full bg-gray-200 rounded-full" />
        
        {/* Active Range */}
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />
        
        {/* Min Handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          className="absolute w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
          style={{ zIndex: minValue > max - 100 ? 5 : 3 }}
        />
        
        {/* Max Handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          className="absolute w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Min/Max Value Indicators */}
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">{formatLabel(min)}</span>
        <span className="text-xs text-gray-400">{formatLabel(max)}</span>
      </div>
    </div>
  );
};

export default Slider;

