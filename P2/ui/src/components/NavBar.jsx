import { useLocation } from "react-router-dom";
import { getAuthToken } from "../services/api";
import { logoutUser } from "../services/auth";
import { useState, useEffect } from "react";

function NavBar({ isLoggedIn, setIsLoggedIn }) {
  const location = useLocation();

  useEffect(() => {
    const checkLoginStatus = () => {
      const currentStatus = !!getAuthToken();
      console.log("Current login status:", currentStatus);

      if (isLoggedIn && !currentStatus) {
        console.log("User logged out due to expired token");
        setIsLoggedIn(false);
        window.location.href = "/";
        return;
      }

      if (isLoggedIn !== currentStatus) {
        setIsLoggedIn(currentStatus);
      }
    };

    checkLoginStatus();

    const interval = setInterval(checkLoginStatus, 60000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path;
    return isActive
      ? "block py-2 px-3 text-light bg-primary rounded-sm md:bg-transparent md:text-primary md:p-0 dark:text-light md:dark:text-primary"
      : "block py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary md:p-0 dark:text-light md:dark:hover:text-primary dark:hover:bg-gray-700 dark:hover:text-light md:dark:hover:bg-transparent";
  };

  const handleLogout = async () => {
    try {
      const response = await logoutUser();
      console.log(response);
      if (response.success) {
        setIsLoggedIn(false);
        window.location.href = "/";
      } else {
        console.error("Error al cerrar sesión:", response.message);
        alert("Error al cerrar sesión");
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setIsLoggedIn(false);
      window.location.href = "/";
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-light border-gray-200 dark:bg-gray-900 shadow-md">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src="domainIcon.png" className="h-8" alt="Flowbite Logo" />
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-light">
            UI Domain Resolver
          </span>
        </a>
        <button
          data-collapse-toggle="navbar-default"
          type="button"
          className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
          aria-controls="navbar-default"
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          <svg
            className="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 17 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 1h15M1 7h15M1 13h15"
            />
          </svg>
        </button>
        <div className="hidden w-full md:block md:w-auto" id="navbar-default">
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 borderrounded-lg md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-light dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            {!isLoggedIn && (
              <>
                <li>
                  <a
                    href="/"
                    className={getNavLinkClass("/")}
                    aria-current="page"
                  >
                    Log In
                  </a>
                </li>
                <li>
                  <a href="/register" className={getNavLinkClass("/register")}>
                    Registrarse
                  </a>
                </li>
              </>
            )}
            {isLoggedIn && (
              <>
                <li>
                <a href="/dashboard" className={getNavLinkClass("/dashboard")}>
                  Dashboard
                </a>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="block py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary md:p-0 dark:text-light md:dark:hover:text-primary dark:hover:bg-gray-700 dark:hover:text-light md:dark:hover:bg-transparent"
                  >
                    Cerrar sesión
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
