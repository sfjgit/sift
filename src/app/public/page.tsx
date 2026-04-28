import AmbientBackground from '@/components/home/AmbientBackground';
import HeroSection from '@/components/home/HeroSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground overflow-hidden">
      <AmbientBackground />
      <HeroSection />
    </div>
  );
}
