import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings } from "feather-icons-react/build/IconComponents";
import { all_routes } from "../../../Router/all_routes";

/**
 * Settings sidebar limited to screens backed by real APIs.
 */
const SettingsSideBar = () => {
  const route = all_routes;
  const location = useLocation();
  const isActive = location.pathname === route.generalsettings;

  return (
    <div className="sidebars settings-sidebar theiaStickySidebar" id="sidebar2">
      <div className="sidebar-inner slimscroll">
        <div id="sidebar-menu5" className="sidebar-menu">
          <ul>
            <li className="submenu-open">
              <ul>
                <li className={isActive ? "active" : ""}>
                  <Link to={route.generalsettings}>
                    <Settings className="feather-chevron-up" />
                    <span>General Settings</span>
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsSideBar;
