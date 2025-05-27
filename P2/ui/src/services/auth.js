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

export const loginSubdomain = async (userData, authMethod) => {
  try {
    let response;
    if (authMethod === "user-password") {
      response = await api.post("/auth/login/subdomain/user", userData, {
        withCredentials: true,
      });
    } else if (authMethod === "api-keys") {
      response = await api.post("/auth/login/subdomain/apikey", userData, {
        withCredentials: true,
      });
    } else {
      throw new Error("Tipo de autenticación no soportado");
    }
    console.log("Response from loginSubdomain", response);
    if (response.status === 200 && response.data.url) {
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
