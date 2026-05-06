import React from 'react';

export function UnitPosting() {
  return (
    <div className="w-full h-full min-h-[600px] flex flex-col relative animate-in slide-in-from-bottom-4 duration-700 bg-black/20 rounded-3xl border border-white/10 overflow-hidden z-10">
      <iframe 
        src="https://www.google.com/maps/d/u/0/embed?mid=1sVuk-qPshgccqAlOzQvumzq7OdeVII8&ehbc=2E312F" 
        className="w-full h-full absolute inset-0 border-none"
        title="Google My Maps Tactical"
        allowFullScreen 
      />
    </div>
  );
}
