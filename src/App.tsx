import { BrowserRouter, Route, Routes, useNavigate } from "react-router";
import Main from "./layout/Main";
import { useEffect } from "react";
import { Dashboard } from "./pages/dashboard/Dashboard";

function RedirectToDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: replace with auth logic
    const isAuthenticated = true; // temporary placeholder
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*Main Layout*/}
        <Route element={<Main />}>
          <Route path="/" element={<RedirectToDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitoring" element={<Dashboard />} />
          <Route path="/create" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
