import React, { useState } from 'react';
import Slider from './Slider';

export default {
  title: 'Components/Slider',
  component: Slider,
  tags: ['autodocs'],
};

export const Default = () => {
  const [range, setRange] = useState({ min: 0, max: 500 });
  
  return (
    <div className="max-w-md p-6">
      <h3 className="text-lg font-semibold mb-4">Price Range</h3>
      <Slider
        min={0}
        max={500}
        minValue={range.min}
        maxValue={range.max}
        onChange={setRange}
      />
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">
          Selected range: ${range.min} - ${range.max}
        </p>
      </div>
    </div>
  );
};

export const CustomRange = () => {
  const [range, setRange] = useState({ min: 50, max: 200 });
  
  return (
    <div className="max-w-md p-6">
      <h3 className="text-lg font-semibold mb-4">Custom Range (50-300)</h3>
      <Slider
        min={50}
        max={300}
        step={10}
        minValue={range.min}
        maxValue={range.max}
        onChange={setRange}
      />
    </div>
  );
};

export const WithCustomFormat = () => {
  const [range, setRange] = useState({ min: 0, max: 1000 });
  
  return (
    <div className="max-w-md p-6">
      <h3 className="text-lg font-semibold mb-4">Budget Range</h3>
      <Slider
        min={0}
        max={1000}
        step={50}
        minValue={range.min}
        maxValue={range.max}
        onChange={setRange}
        formatLabel={(value) => `$${value.toFixed(0)}`}
      />
    </div>
  );
};

