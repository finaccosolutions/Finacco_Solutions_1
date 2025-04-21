import React from 'react';
import { Landmark } from 'lucide-react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <Landmark className="h-8 w-8 text-white" />
      <span className="text-xl font-bold">
        <span className="text-white">Finacco</span>
        <span className="text-gray-200">Solutions</span>
      </span>
    </div>
  );
};

export default Logo;