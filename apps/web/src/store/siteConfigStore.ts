import { create } from 'zustand';

export interface SiteConfig {
  site_name: string;
  site_description: string;
  primary_color: string;
  contact_email: string;
  hero_title: string;
  hero_subtitle: string;
  footer_text: string;
  logo_url: string;
  [key: string]: string;
}

interface SiteConfigState {
  config: SiteConfig;
  isLoaded: boolean;
  setConfig: (config: SiteConfig) => void;
}

const defaultConfig: SiteConfig = {
  site_name: 'PhotoGal',
  site_description: 'Partagez vos plus belles photos',
  primary_color: '#1677ff',
  contact_email: '',
  hero_title: 'Bienvenue sur PhotoGal',
  hero_subtitle: 'Découvrez nos galeries photos et téléchargez vos favoris',
  footer_text: '© 2024 PhotoGal. Tous droits réservés.',
  logo_url: '',
};

export const useSiteConfigStore = create<SiteConfigState>((set) => ({
  config: defaultConfig,
  isLoaded: false,
  setConfig: (config) => set({ config, isLoaded: true }),
}));
