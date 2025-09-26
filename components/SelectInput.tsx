import React from 'react';

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, value, onChange, options, placeholder, disabled = false }) => {
  return (
    <div className="w-full">
      <label htmlFor={label} className="block text-sm font-medium text-slate-400 mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          id={label}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full pl-3 pr-10 py-2.5 text-base text-white bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SelectInput;
