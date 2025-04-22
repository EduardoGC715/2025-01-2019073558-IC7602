import React from "react";
import AppRouter from "./AppRouter"
import { ToastContainer } from 'react-toastify';


export default function App() {
  return <div>        
    <ToastContainer />
    <AppRouter />
    </div>;
}