import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const RouteChangeDebugger = () => {
  const location = useLocation();

  useEffect(() => {
    console.info("[router] Navigated", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      timestamp: new Date().toISOString(),
    });
  }, [location]);

  return null;
};

export default RouteChangeDebugger;
