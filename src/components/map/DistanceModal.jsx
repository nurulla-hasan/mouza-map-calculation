import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const DistanceModal = ({ isOpen, onClose, onSubmit }) => {
  const [distance, setDistance] = useState('');
  const [error, setError] = useState('');
  if (!isOpen) return null;

  const handleSubmit = () => {
    const num = parseFloat(distance);
    if (Number.isFinite(num) && num > 0) {
      onSubmit(num);
      setDistance('');
      setError('');
    } else {
      setError('Distance must be a number greater than 0');
    }
  };

  const handleClose = () => {
    setDistance('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 print:hidden">
      <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-1/3">
        <h3 className="text-lg font-semibold mb-4">প্রকৃত দূরত্ব লিখুন</h3>
        <Input
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="e.g., 330 (in feet)"
          className="mb-2"
          min="0"
          step="any"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </div>
      </div>
    </div>
  );
};
