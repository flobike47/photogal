import { create } from 'zustand';

export interface SiteConfig {
  site_name: string;
  site_description: string;
  primary_color: string;
  contact_email: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  footer_text: string;
  logo_url: string;
  about_title: string;
  about_text: string;
  about_image_url: string;
  social_instagram: string;
  social_facebook: string;
  social_pinterest: string;
  social_website: string;
  heading_font: string;
  site_theme: string;
  cta_button_text: string;
  portfolio_title: string;
  portfolio_cta_text: string;
  contact_page_title: string;
  contact_bg_color: string;
  contact_bg_url: string;
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
  hero_image_url: '',
  footer_text: '© 2024 PhotoGal. Tous droits réservés.',
  logo_url: '',
  about_title: 'À propos',
  about_text: '',
  about_image_url: '',
  social_instagram: '',
  social_facebook: '',
  social_pinterest: '',
  social_website: '',
  heading_font: 'cormorant',
  site_theme: 'dark',
  cta_button_text: 'Découvrir les galeries',
  portfolio_title: 'Portfolio',
  portfolio_cta_text: 'Réserver une séance →',
  contact_page_title: 'Parlons de votre projet',
  contact_bg_color: '',
  contact_bg_url: '',
};

export const useSiteConfigStore = create<SiteConfigState>((set) => ({
  config: defaultConfig,
  isLoaded: false,
  setConfig: (config) => set({ config, isLoaded: true }),
}));
