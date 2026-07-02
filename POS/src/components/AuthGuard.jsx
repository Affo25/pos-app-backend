/* eslint-disable react/prop-types */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { all_routes } from "../Router/all_routes";

const AuthGuard = ({ children }) => {
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to={all_routes.signin} state={{ from: location }} replace />
    );
  }

  return children;
};

export default AuthGuard;
