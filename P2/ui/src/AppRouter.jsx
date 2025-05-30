import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import NavBar from "./components/NavBar";
import Login from "./components/Login";
import LoginSubdomain from "./components/LoginSubdomain";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DNSRegisterCard from "./components/DNSRegisterCard";
import ProtectedRoutes from "./components/ProtectedRoutes";
import SubdomainsDashboard from "./components/SubdomainsDashboard";
import SubdomainForm from "./components/SubdomainForms";
import ChangePassword from "./components/ChangePassword";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function AppRouter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchParams] = useSearchParams();
  const subdomain = searchParams.get("subdomain");
  const authMethod = searchParams.get("authMethod");
  return (
    <div className="min-h-screen bg-light">
      {!subdomain && (
        <NavBar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      )}

      <div className="py-10">
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <ToastContainer position="top-right" autoClose={5000} />
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
                    />
                  )
                }
              />
              <Route path="/login" element={<LoginSubdomain />} />
              <Route
                path="/register"
                element={
                  isLoggedIn ? <Navigate to="/dashboard" /> : <Register />
                }
              />
              <Route
                path="/change-password"
                element={<ChangePassword/>}
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
                  element={<SubdomainForm />}
                />
                <Route
                  path="/domains/:domain/subdomains/:subdomain"
                  element={<SubdomainForm />}
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
