import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import { router } from './router';
import { useSiteConfigStore } from './store/siteConfigStore';
import { apiClient } from './api/client';
import type { SiteConfig } from './store/siteConfigStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ThemedApp() {
  const { config, setConfig } = useSiteConfigStore();

  useEffect(() => {
    apiClient.get<SiteConfig>('/config').then((res) => {
      setConfig(res.data);
      document.title = res.data.site_name || 'PhotoGal';
    });
  }, [setConfig]);

  return (
    <ConfigProvider
      locale={frFR}
      theme={{ token: { colorPrimary: config.primary_color || '#1677ff' } }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  );
}
