import { Navigate, Outlet } from "react-router-dom";
import { getAuthToken } from "../services/api";

function ProtectedRoutes() {
  const token = getAuthToken();
  console.log("ProtectedRoutes token:", token);
  return token ? <Outlet /> : <Navigate to="/" />;
}

export default ProtectedRoutes;
/* Referencias para rutas protegidas
https://medium.com/@dennisivy/creating-protected-routes-with-react-router-v6-2c4bbaf7bc1c
*/
