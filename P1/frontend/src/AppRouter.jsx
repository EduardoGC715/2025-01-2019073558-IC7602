import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> }
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
