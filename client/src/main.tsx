import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

import "./styles/reset.css";
import "./styles/common.css";
// import { ApolloProvider } from "@apollo/client/react";
import { AuthProvider } from "./context/AuthProvider";
// import { client } from "./apollo/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
