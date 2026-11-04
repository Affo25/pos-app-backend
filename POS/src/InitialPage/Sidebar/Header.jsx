/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import FeatherIcon from "feather-icons-react";
import ImageWithBasePath from "../../core/img/imagewithbasebath";
import { Search, XCircle } from "react-feather";
import { all_routes } from "../../Router/all_routes";
import { resolveMediaUrl } from "../../redux/utils/uploadMedia";
import PrinterConnectPanel from "../../components/PrinterConnectPanel";
import { getAppBranding } from "../../utils/appBranding";
import {
  logoutAction,
  refreshProfileAction,
} from "../../redux/authentication/authSlice";

const formatUserRole = (user) => {
  if (!user) return "User";
  if (user.role_name) return user.role_name;
  if (user.role_id?.name) return user.role_id.name;
  const type = String(user.user_type || "").toLowerCase();
  if (type === "superadmin") return "Super Admin";
  if (type === "admin") return "Admin";
  if (type) return type.charAt(0).toUpperCase() + type.slice(1);
  return "User";
};

const Header = () => {
  const route = all_routes;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [toggle, SetToggle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const settings = useSelector((state) => state.settings?.settings);
  const authUser = useSelector((state) => state.auth?.user);
  const appBrand = useMemo(() => getAppBranding(settings), [settings]);
  const connectedPrinter = String(settings?.invoiceDesign?.connectedPrinter || "").trim();

  const displayName = authUser?.name || "User";
  const displayRole = formatUserRole(authUser);
  const displayEmail = authUser?.email || "";
  const displayPhone = authUser?.phone || "";
  const avatarUrl = useMemo(
    () => resolveMediaUrl(authUser?.image),
    [authUser?.image],
  );
  const avatarInitial = (displayName || "U").charAt(0).toUpperCase();

  useEffect(() => {
    if (Cookies.get("token")) {
      dispatch(refreshProfileAction());
    }
  }, [dispatch]);

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutAction());
    navigate("/signin");
  };

  const isElementVisible = (element) => {
    return element.offsetWidth > 0 || element.offsetHeight > 0;
  };

  const slideDownSubmenu = () => {
    const subdropPlusUl = document.getElementsByClassName("subdrop");
    for (let i = 0; i < subdropPlusUl.length; i++) {
      const submenu = subdropPlusUl[i].nextElementSibling;
      if (submenu && submenu.tagName.toLowerCase() === "ul") {
        submenu.style.display = "block";
      }
    }
  };

  const slideUpSubmenu = () => {
    const subdropPlusUl = document.getElementsByClassName("subdrop");
    for (let i = 0; i < subdropPlusUl.length; i++) {
      const submenu = subdropPlusUl[i].nextElementSibling;
      if (submenu && submenu.tagName.toLowerCase() === "ul") {
        submenu.style.display = "none";
      }
    }
  };

  useEffect(() => {
    const handleMouseover = (e) => {
      e.stopPropagation();

      const body = document.body;
      const toggleBtn = document.getElementById("toggle_btn");

      if (
        body.classList.contains("mini-sidebar") &&
        isElementVisible(toggleBtn)
      ) {
        const target = e.target.closest(".sidebar, .header-left");

        if (target) {
          body.classList.add("expand-menu");
          slideDownSubmenu();
        } else {
          body.classList.remove("expand-menu");
          slideUpSubmenu();
        }

        e.preventDefault();
      }
    };

    document.addEventListener("mouseover", handleMouseover);

    return () => {
      document.removeEventListener("mouseover", handleMouseover);
    };
  }, []); // Empty dependency array ensures that the effect runs only once on mount
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement ||
          document.mozFullScreenElement ||
          document.webkitFullscreenElement ||
          document.msFullscreenElement
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);
  const handlesidebar = () => {
    document.body.classList.toggle("mini-sidebar");
    SetToggle((current) => !current);
  };
  const expandMenu = () => {
    document.body.classList.remove("expand-menu");
  };
  const expandMenuOpen = () => {
    document.body.classList.add("expand-menu");
  };
  const sidebarOverlay = () => {
    document?.querySelector(".main-wrapper")?.classList?.toggle("slide-nav");
    document?.querySelector(".sidebar-overlay")?.classList?.toggle("opened");
    document?.querySelector("html")?.classList?.toggle("menu-opened");
  };

  let pathname = location.pathname;

  const exclusionArray = [
    "/reactjs/template/dream-pos/index-three",
    "/reactjs/template/dream-pos/index-one",
  ];
  if (exclusionArray.indexOf(window.location.pathname) >= 0) {
    return "";
  }




  const toggleFullscreen = (elem) => {
    elem = elem || document.documentElement;
    if (
      !document.fullscreenElement &&
      !document.mozFullScreenElement &&
      !document.webkitFullscreenElement &&
      !document.msFullscreenElement
    ) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  return (
    <>
      <div className="header">
        {/* Logo */}
        <div
          className={`header-left ${toggle ? "" : "active"}`}
          onMouseLeave={expandMenu}
          onMouseOver={expandMenuOpen}
        >
          <Link to="/" className="header-brand-row" title={appBrand.name}>
            <img src={appBrand.logoUrl} alt="" className="header-brand-logo" />
            <span className="header-brand-name">{appBrand.name}</span>
          </Link>
          <Link
            id="toggle_btn"
            to="#"
            style={{
              display: pathname.includes("tasks")
                ? "none"
                : pathname.includes("compose")
                ? "none"
                : "",
            }}
            onClick={handlesidebar}
          >
            <FeatherIcon icon="chevrons-left" className="feather-16" />
          </Link>
        </div>
        {/* /Logo */}
        <Link
          id="mobile_btn"
          className="mobile_btn"
          to="#"
          onClick={sidebarOverlay}
        >
          <span className="bar-icon">
            <span />
            <span />
            <span />
          </span>
        </Link>
        {/* Header Menu */}
        <ul className="nav user-menu">
          {/* Search */}
          <li className="nav-item nav-searchinputs">
            <div className="top-nav-search">
              <Link to="#" className="responsive-search">
                <Search />
              </Link>
              <form action="#" className="dropdown">
                <div
                  className="searchinputs dropdown-toggle"
                  id="dropdownMenuClickable"
                  data-bs-toggle="dropdown"
                  data-bs-auto-close="false"
                >
                  <input type="text" placeholder="Search" />
                  <div className="search-addon">
                    <span>
                      <XCircle className="feather-14" />
                    </span>
                  </div>
                </div>
                <div
                  className="dropdown-menu search-dropdown"
                  aria-labelledby="dropdownMenuClickable"
                >
                  <div className="search-info">
                    <h6>
                      <span>
                        <i data-feather="search" className="feather-16" />
                      </span>
                      Recent Searches
                    </h6>
                    <ul className="search-tags">
                      <li>
                        <Link to="#">Products</Link>
                      </li>
                      <li>
                        <Link to="#">Sales</Link>
                      </li>
                      <li>
                        <Link to="#">Applications</Link>
                      </li>
                    </ul>
                  </div>
                  <div className="search-info">
                    <h6>
                      <span>
                        <i data-feather="help-circle" className="feather-16" />
                      </span>
                      Help
                    </h6>
                    <p>
                      How to Change Product Volume from 0 to 200 on Inventory
                      management
                    </p>
                    <p>Change Product Name</p>
                  </div>
                  <div className="search-info">
                    <h6>
                      <span>
                        <i data-feather="user" className="feather-16" />
                      </span>
                      Customers
                    </h6>
                    <ul className="customers">
                      <li>
                        <Link to="#">
                          Aron Varu
                          <ImageWithBasePath
                            src="assets/img/profiles/avator1.jpg"
                            alt
                            className="img-fluid"
                          />
                        </Link>
                      </li>
                      <li>
                        <Link to="#">
                          Jonita
                          <ImageWithBasePath
                            src="assets/img/profiles/avatar-01.jpg"
                            alt
                            className="img-fluid"
                          />
                        </Link>
                      </li>
                      <li>
                        <Link to="#">
                          Aaron
                          <ImageWithBasePath
                            src="assets/img/profiles/avatar-10.jpg"
                            alt
                            className="img-fluid"
                          />
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </form>
            </div>
          </li>
          {/* /Search */}

          {/* Printer connect */}
          <li className="nav-item dropdown has-arrow main-drop select-store-dropdown">
            <Link
              to="#"
              className="dropdown-toggle nav-link select-store"
              data-bs-toggle="dropdown"
              title={connectedPrinter || "Connect printer"}
            >
              <span className="user-info">
                <span className="user-letter d-flex align-items-center justify-content-center">
                  <FeatherIcon icon="printer" className="feather-16" />
                </span>
                <span className="user-detail">
                  <span className="user-name">
                    {connectedPrinter || "Connect printer"}
                  </span>
                </span>
              </span>
            </Link>
            <div className="dropdown-menu dropdown-menu-right">
              <PrinterConnectPanel compact />
            </div>
          </li>
          {/* /Printer connect */}

          <li className="nav-item nav-item-box">
            <Link
              to="#"
              id="btnFullscreen"
              onClick={() => toggleFullscreen()}
              className={isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
            >
              <FeatherIcon icon="maximize" />
            </Link>
          </li>
          {/* Notifications */}
          <li className="nav-item dropdown nav-item-box">
            <Link
              to="#"
              className="dropdown-toggle nav-link"
              data-bs-toggle="dropdown"
            >
              <FeatherIcon icon="bell" />
            </Link>
            <div className="dropdown-menu notifications">
              <div className="topnav-dropdown-header">
                <span className="notification-title">Notifications</span>
                <Link to="#" className="clear-noti">
                  Clear All
                </Link>
              </div>
              <div className="noti-content">
                <ul className="notification-list">
                  <li className="notification-message">
                    <Link to="/activities">
                      <div className="media d-flex">
                        <span className="avatar flex-shrink-0">
                          <ImageWithBasePath
                            alt="img"
                            src="assets/img/profiles/avatar-02.jpg"
                          />
                        </span>
                        <div className="media-body flex-grow-1">
                          <p className="noti-details">
                            <span className="noti-title">System</span> No new
                            notifications
                          </p>
                          <p className="noti-time">
                            <span className="notification-time">Just now</span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="topnav-dropdown-footer">
                <Link to="/activities">View all Notifications</Link>
              </div>
            </div>
          </li>
          {/* /Notifications */}
          <li className="nav-item dropdown has-arrow main-drop header-profile-drop">
            <Link
              to="#"
              className="dropdown-toggle nav-link userset"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span className="user-info">
                <span className="user-letter">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="img-fluid header-user-avatar" />
                  ) : (
                    <span className="header-user-avatar-fallback">{avatarInitial}</span>
                  )}
                </span>
                <span className="user-detail">
                  <span className="user-name">{displayName}</span>
                  <span className="user-role">{displayRole}</span>
                </span>
              </span>
            </Link>
            <div className="dropdown-menu dropdown-menu-end menu-drop-user header-profile-menu">
              <div className="header-profile-card">
                <div className="header-profile-card-top">
                  <div className="header-profile-avatar-wrap">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="header-profile-avatar-img" />
                    ) : (
                      <span className="header-user-avatar-fallback is-xl">{avatarInitial}</span>
                    )}
                    <span className="header-profile-online" />
                  </div>
                  <div className="header-profile-copy">
                    <div className="header-profile-name" title={displayName}>
                      {displayName}
                    </div>
                    <div className="header-profile-role">{displayRole}</div>
                    {displayEmail ? (
                      <div className="header-profile-line" title={displayEmail}>
                        {displayEmail}
                      </div>
                    ) : null}
                    {displayPhone ? (
                      <div className="header-profile-line" title={displayPhone}>
                        {displayPhone}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="header-profile-actions">
                  <Link className="header-profile-action" to={route.generalsettings}>
                    <FeatherIcon icon="settings" size={16} />
                    <span>Settings</span>
                  </Link>
                  <Link
                    className="header-profile-action is-danger"
                    to="/signin"
                    onClick={handleLogout}
                  >
                    <FeatherIcon icon="log-out" size={16} />
                    <span>Logout</span>
                  </Link>
                </div>
              </div>
            </div>
          </li>
        </ul>
        {/* /Header Menu */}
        {/* Mobile Menu */}
        <div className="dropdown mobile-user-menu">
          <Link
            to="#"
            className="nav-link dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="fa fa-ellipsis-v" />
          </Link>
          <div className="dropdown-menu dropdown-menu-right">
            <div className="px-3 py-2 border-bottom">
              <div className="fw-semibold">{displayName}</div>
              <div className="small text-muted">{displayRole}</div>
              {displayEmail ? <div className="small text-muted">{displayEmail}</div> : null}
            </div>
            <Link className="dropdown-item" to={route.generalsettings}>
              Settings
            </Link>
            <Link className="dropdown-item" to="/signin" onClick={handleLogout}>
              Logout
            </Link>
          </div>
        </div>
        {/* /Mobile Menu */}
      </div>
    </>
  );
};

export default Header;
