import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppConfig } from "../types";
import { mockConfig } from "../mocks/data";

interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: mockConfig,
  loading: true,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>({
    appName: import.meta.env.VITE_APP_NAME ?? "AI-LMIS",
    appShortName: import.meta.env.VITE_APP_SHORT_NAME ?? "AI-LMIS",
    appTagline: import.meta.env.VITE_APP_TAGLINE ?? "Labour Market Intelligence & Skill Demand-Supply Forecasting Engine",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const useMock = import.meta.env.VITE_USE_MOCK === "true";
    if (useMock) {
      setConfig(mockConfig);
      setLoading(false);
      return;
    }
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    fetch(`${apiUrl}/api/config`)
      .then((r) => r.json())
      .then((data: AppConfig) => setConfig(data))
      .catch(() => {/* fallback to env defaults already set */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
