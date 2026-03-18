import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './select';

export interface CustomSelectOption {
  value: string;
  title: string;
  subtitle?: string;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, className, placeholder }) => {
  return (
    <Select value={value} onValueChange={onChange}>
  <SelectTrigger className={className ? `${className} bg-white py-4 min-h-[48px]` : 'w-full bg-white py-4 min-h-[48px]'}>
        <SelectValue>
          {(() => {
            const selected = options.find(opt => opt.value === value);
            return selected ? (
              <div className="flex flex-col items-start">
                <span>{selected.title}</span>
                {selected.subtitle && <span className="text-xs pl-4 mt-0.5">{selected.subtitle}</span>}
              </div>
            ) : (
              <span className="text-gray-400">{placeholder || 'Chọn một mục'}</span>
            );
          })()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-full bg-white">
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex flex-col items-start">
              <span>{opt.title}</span>
              {opt.subtitle && <span className="text-xs pl-4 mt-0.5">{opt.subtitle}</span>}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
