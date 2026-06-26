interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GsiButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: string;
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
}

interface Google {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void;
      disableAutoSelect(): void;
      revoke(hint: string, done: () => void): void;
    };
  };
}

declare global {
  interface Window {
    google?: Google;
  }
}

export {};
