import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppConfig } from "../types";
import { mockConfig } from "../mocks/data";
import { fetchConfig } from "../services/api";

interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
  error: string | null;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: mockConfig,
  loading: true,
  error: null,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>({
    appName: import.meta.env.VITE_APP_NAME ?? "AI-LMIS",
    appShortName: import.meta.env.VITE_APP_SHORT_NAME ?? "AI-LMIS",
    appTagline: import.meta.env.VITE_APP_TAGLINE ?? "Labour Market Intelligence & Skill Demand-Supply Forecasting Engine",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const useMock = import.meta.env.VITE_USE_MOCK === "true";
    if (useMock) {
      setConfig(mockConfig);
      setLoading(false);
      return;
    }

    // Use the API service (relative path, proxied by Vite in dev)
    fetchConfig()
      .then((data) => {
        setConfig({
          appName: data.app_name,
          appShortName: data.app_short_name,
          appTagline: data.app_tagline,
        });
        setError(null);
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to load config");
        // Keep env defaults already set as fallback
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
