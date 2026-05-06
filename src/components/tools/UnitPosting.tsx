import React from 'react';

export function UnitPosting() {
  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col relative bg-[#0f172a] rounded-xl overflow-hidden mt-2">
      <iframe 
        src="https://www.google.com/maps/d/u/0/embed?mid=1sVuk-qPshgccqAlOzQvumzq7OdeVII8&ehbc=2E312F" 
        className="absolute inset-0 w-full h-full"
        style={{ border: 0 }}
        title="Google My Maps Tactical"
        allowFullScreen 
      />
    </div>
  );
}
