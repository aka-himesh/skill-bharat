import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { ConfigProvider } from "./context/ConfigContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Overview from "./pages/Overview";
import Gaps from "./pages/Gaps";
import Alerts from "./pages/Alerts";
import Recommendations from "./pages/Recommendations";
import Methodology from "./pages/Methodology";
import Sources from "./pages/Sources";
import ApiDocs from "./pages/ApiDocs";
import StateDrilldown from "./pages/StateDrilldown";
import DistrictDrilldown from "./pages/DistrictDrilldown";
import "./i18n/index";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 300000 } } });

function NotFound() {
  return <div style={{ padding: 64, textAlign: "center" }}><div style={{ fontSize: 48, fontWeight: 800, color: "var(--color-border-dark)" }}>404</div><div style={{ fontSize: 16, color: "var(--color-text-secondary)", marginTop: 8 }}>Page not found.</div><a href="/" style={{ display: "inline-block", marginTop: 16, color: "var(--color-primary)", fontSize: 13 }}>Go to Home</a></div>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AccessibilityProvider>
        <ConfigProvider>
          <BrowserRouter>
            <Suspense fallback={<div style={{ padding: 64, textAlign: "center", color: "var(--color-text-muted)" }}>Loading…</div>}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/state/:stateId" element={<StateDrilldown />} />
                  <Route path="/district/:districtId" element={<DistrictDrilldown />} />
                  <Route path="/gaps" element={<Gaps />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                  <Route path="/methodology" element={<Methodology />} />
                  <Route path="/sources" element={<Sources />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ConfigProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
