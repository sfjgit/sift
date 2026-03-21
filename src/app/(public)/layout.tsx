import HomeNav from '@/components/home/HomeNav';
import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeNav />
      {children}
    </>
  );
}
