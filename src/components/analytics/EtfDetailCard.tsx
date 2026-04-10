'use client';

import EtfTerminalCard from './EtfTerminalCard';
import type { EtfProfile } from '@/types/etf';

interface EtfDetailCardProps {
  profile: EtfProfile;
  onToggleSave: () => void;
}

export default function EtfDetailCard({ profile, onToggleSave }: EtfDetailCardProps) {
  return (
    <EtfTerminalCard 
      data={profile} 
      onToggleSave={onToggleSave} 
    />
  );
}
