import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import IPToCountryDashboard from "./pages/IPToCountryDashboard";


const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/ip-to-country",
    element: <IPToCountryDashboard />,
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}