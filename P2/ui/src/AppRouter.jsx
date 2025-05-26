import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import NavBar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DNSRegisterCard from "./components/DNSRegisterCard";
import ProtectedRoutes from "./components/ProtectedRoutes";
import SubdomainsDashboard from "./components/SubdomainsDashboard";
import SubdomainRegisterCard from "./components/SubdomainRegisterCard";

function AppRouter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchParams] = useSearchParams();
  const subdomain = searchParams.get("subdomain");
  const authMethod = searchParams.get("authMethod");
  console.log("Subdomain:", subdomain, "Auth Method:", authMethod);
  return (
    <div className="min-h-screen bg-light">
      {!subdomain && (
        <NavBar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      )}

      <div className="py-10">
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Routes>
              <Route
                path="/"
                element={
                  isLoggedIn ? (
                    <Navigate to="/dashboard" />
                  ) : (
                    <Login
                      isLoggedIn={isLoggedIn}
                      setIsLoggedIn={setIsLoggedIn}
                      subdomain={subdomain}
                      authMethod={authMethod}
                    />
                  )
                }
              />
              <Route
                path="/register"
                element={
                  isLoggedIn ? <Navigate to="/dashboard" /> : <Register />
                }
              />
              <Route
                path="/change-password"
                element={<Register title="Cambiar contraseña" />}
              />
              <Route element={<ProtectedRoutes />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/register-dns" element={<DNSRegisterCard />} />
              </Route>
              <Route element={<ProtectedRoutes />}>
                <Route
                  path="/domains/:domain/subdomains"
                  element={<SubdomainsDashboard />}
                />
                <Route
                  path="/domains/:domain/subdomains/register"
                  element={<SubdomainRegisterCard />}
                />
              </Route>
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppRouter;
