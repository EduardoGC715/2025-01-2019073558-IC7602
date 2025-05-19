import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import NavBar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DNSRegisterCard from "./components/DNSRegisterCard";
import ProtectedRoutes from "./components/ProtectedRoutes";

function AppRouter() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-light">
        <NavBar currentUser={currentUser} onLogout={handleLogout} />

        <div className="py-10">
          <main>
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <Routes>
                <Route
                  path="/"
                  element={
                    currentUser ? (
                      <Navigate to="/" />
                    ) : (
                      <Login onLoginSuccess={(user) => setCurrentUser(user)} />
                    )
                  }
                />
                <Route
                  path="/register"
                  element={
                    currentUser ? (
                      <Navigate to="/" />
                    ) : (
                      <Register
                        onRegisterSuccess={(user) => setCurrentUser(user)}
                      />
                    )
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
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default AppRouter;
