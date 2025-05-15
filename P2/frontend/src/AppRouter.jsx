import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import IPToCountryDashboard from "./pages/IPToCountryDashboard.jsx";


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

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
