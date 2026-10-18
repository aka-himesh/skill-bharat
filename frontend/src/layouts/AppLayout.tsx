import { Outlet, useLocation } from "react-router-dom";
import UtilityBar from "../components/layout/UtilityBar";
import Header from "../components/layout/Header";
import FilterBar from "../components/layout/FilterBar";
import Footer from "../components/layout/Footer";
import Breadcrumb from "../components/ui/Breadcrumb";
import { FilterProvider } from "../context/FilterContext";

const FILTER_PAGES = ["/overview", "/gaps", "/alerts", "/recommendations", "/state", "/district"];

function InnerLayout() {
  const location = useLocation();
  const showFilter = FILTER_PAGES.some((p) => location.pathname.startsWith(p));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <UtilityBar />
      <Header />
      <FilterProvider>
        {showFilter && <FilterBar />}
        <Breadcrumb />
        <main id="main-content" tabIndex={-1} style={{ flex: 1 }}>
          <Outlet />
        </main>
      </FilterProvider>
      <Footer />
    </div>
  );
}

export default function AppLayout() {
  return <InnerLayout />;
}
