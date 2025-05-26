import { api } from "./api";

export const registerUser = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData, {
      withCredentials: true,
    });
    if (response.status === 200 || response.status == 201) {
      // setAuthToken(response.data.token);
      return {
        success: true,
        message: "Usuario registrado exitosamente",
      };
    }
    return {
      success: false,
      message: response.data?.message || "Error al registrar usuario",
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Error al registrar usuario",
    };
  }
};

export const loginUser = async (userData) => {
  try {
    const response = await api.post("/auth/login", userData, {
      withCredentials: true,
    });
    if (response.status === 200) {
      // setAuthToken(response.data.token);
      return {
        success: true,
        message: "Usuario logueado exitosamente",
      };
    }
    return {
      success: false,
      message: response.data?.message || "Error al loguear usuario",
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Error al loguear usuario",
    };
  }
};

export const loginSubdomainUser = async (userData) => {
  try {
    const response = await api.post("/auth/login/subdomain", userData, {
      withCredentials: true,
    });
    console.log("Response from loginSubdomainUser:", response);
    if (response.status === 200 && response.data.url) {
      console.log("HERE2");
      // setAuthToken(response.data.token);
      window.location.href = response.data.url;
      // Esto redirige al usuario a la URL proporcionada por el backend
      return {
        success: true,
        message: "Usuario logueado exitosamente",
        url: response.data.url,
      };
    }
    return {
      success: false,
      message: response.data?.message || "Error al loguear usuario",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: error.response?.data?.message || "Error al loguear usuario",
    };
  }
};

export const logoutUser = async () => {
  try {
    const response = await api.get("/auth/logout");
    if (response.status === 200) {
      console.log("HERE1");
      // setAuthToken(null);
      return {
        success: true,
        message: "Sesión cerrada exitosamente",
      };
    }
    return {
      success: false,
      message: response.data?.message || "Error al cerrar sesión",
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Error al cerrar sesión",
    };
  }
};
