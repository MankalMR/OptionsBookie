'use client';

import EtfCard from './EtfCard';
import type { EtfProfile } from '@/types/etf';

interface EtfDetailCardProps {
  profile: EtfProfile;
  onToggleSave: () => void;
}

export default function EtfDetailCard({ profile, onToggleSave }: EtfDetailCardProps) {
  return (
    <EtfCard 
      data={profile} 
      onToggleSave={onToggleSave} 
    />
  );
}
