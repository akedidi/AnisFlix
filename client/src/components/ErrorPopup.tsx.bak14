import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorPopupProps {
  title: string;
  message: string;
  onClose: () => void;
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({
  title,
  message,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4 text-red-600">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{message}</p>
        <div className="text-center">
          <Button onClick={onClose} variant="default">
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};
