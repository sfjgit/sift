import React from 'react';

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      This is the end
      {children}
    </div>
  );
}
