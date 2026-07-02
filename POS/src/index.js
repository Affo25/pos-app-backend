
import React from "react";
import { BrowserRouter } from 'react-router-dom';
import ReactDOM from 'react-dom';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../node_modules/bootstrap/dist/js/bootstrap.bundle.js';
import { base_path } from "./environment.jsx";
import '../src/style/css/feather.css'
import '../src/style/css/line-awesome.min.css'
import "../src/style/scss/main.scss";
import '../src/style/icons/fontawesome/css/fontawesome.min.css'
import '../src/style/icons/fontawesome/css/all.min.css'


import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import store from "./redux/store";
import AllRoutes from "./Router/router.jsx";

const rootElement = document.getElementById('root');



if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={base_path}>
        <AllRoutes />
        <ToastContainer position="top-right" autoClose={3000} />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
  );
} else {
  console.error("Element with id 'root' not found.");
}
