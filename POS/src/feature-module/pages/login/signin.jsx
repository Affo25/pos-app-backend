import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ImageWithBasePath from "../../../core/img/imagewithbasebath";
import { all_routes } from "../../../Router/all_routes";
import { loginAction } from "../../../redux/authentication/authSlice";

const Signin = () => {
  const route = all_routes;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || route.dashboard;
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate, route.dashboard]);

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(loginAction({ email: email.trim(), password }));
  };

  return (
    <div className="main-wrapper">
      <div className="account-content">
        <div className="login-split">
          <aside className="login-split__visual" aria-hidden="true">
            <div className="login-split__visual-overlay" />
            <div className="login-split__visual-content">
              <ImageWithBasePath
                src="assets/img/logo-white.png"
                alt="POS"
                className="login-split__brand"
              />
              <h1>Run your store with clarity</h1>
              <p>
                Sign in to manage sales, inventory, and customers from one
                modern POS workspace.
              </p>
            </div>
          </aside>

          <section className="login-split__panel">
            <div className="login-split__card">
              <div className="login-split__card-header">
                <div className="login-split__logo-mobile">
                  <ImageWithBasePath src="assets/img/logo.png" alt="POS" />
                </div>
                <h2>Welcome back</h2>
                <p>Access the POS panel with your email and password.</p>
              </div>

              {error ? (
                <div className="login-split__alert" role="alert">
                  {error}
                </div>
              ) : null}

              <form className="login-split__form" onSubmit={handleSubmit}>
                <div className="login-split__field">
                  <label htmlFor="login-email">Email address</label>
                  <div className="login-split__input-wrap">
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                    />
                    <ImageWithBasePath
                      src="assets/img/icons/mail.svg"
                      alt=""
                      className="login-split__input-icon"
                    />
                  </div>
                </div>

                <div className="login-split__field">
                  <label htmlFor="login-password">Password</label>
                  <div className="login-split__input-wrap">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="login-split__eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <span
                        className={`fas ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="login-split__meta">
                  <label className="login-split__remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <Link className="login-split__forgot" to={route.forgotPassword}>
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="login-split__submit"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <p className="login-split__footer">
                New on our platform?{" "}
                <Link to={route.register}>Create an account</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Signin;
