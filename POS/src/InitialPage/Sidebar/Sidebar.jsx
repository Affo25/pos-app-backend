import React, { useEffect, useMemo, useState } from "react";
import Scrollbars from "react-custom-scrollbars-2";
import { Link, useLocation } from "react-router-dom";
import { SidebarData } from "../../core/json/siderbar_data";
import HorizontalSidebar from "./horizontalSidebar";
import CollapsedSidebar from "./collapsedSidebar";

const collectLinks = (items = []) => {
  const links = [];
  items.forEach((item) => {
    if (item?.link) links.push(item.link);
    if (item?.submenuItems?.length) links.push(...collectLinks(item.submenuItems));
  });
  return links;
};

const Sidebar = () => {
  const Location = useLocation();

  const initialOpen = useMemo(() => {
    const open = {};
    SidebarData.forEach((section) => {
      if (!section.submenu) return;
      const links = collectLinks(section.submenuItems || []);
      const hasActive = links.includes(Location.pathname);
      open[section.label] = hasActive || Boolean(section.submenuOpen);
    });
    return open;
  }, []);

  const [openMenus, setOpenMenus] = useState(initialOpen);
  const [nestedOpen, setNestedOpen] = useState("");

  useEffect(() => {
    SidebarData.forEach((section) => {
      if (!section.submenu) return;
      const links = collectLinks(section.submenuItems || []);
      if (links.includes(Location.pathname)) {
        setOpenMenus((prev) => ({ ...prev, [section.label]: true }));
      }
    });
  }, [Location.pathname]);

  const toggleMain = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const toggleNested = (label) => {
    setNestedOpen((prev) => (prev === label ? "" : label));
  };

  const isDashboardPath =
    Location.pathname === "/" ||
    Location.pathname === "/dashboard" ||
    Location.pathname === "/index";

  return (
    <div>
      <div className="sidebar" id="sidebar">
        <Scrollbars>
          <div className="sidebar-inner slimscroll">
            <div id="sidebar-menu" className="sidebar-menu">
              <ul>
                {SidebarData.map((section) => {
                  if (!section.submenu) {
                    const link = section.link || "#";
                    const active =
                      link === Location.pathname ||
                      (section.label === "Dashboard" && isDashboardPath);
                    return (
                      <li key={section.label} className={active ? "active" : ""}>
                        <Link to={link} className={active ? "active" : ""}>
                          {section.icon}
                          <span>{section.label}</span>
                        </Link>
                      </li>
                    );
                  }

                  const sectionLinks = collectLinks(section.submenuItems || []);
                  const sectionActive = sectionLinks.includes(Location.pathname);
                  const isOpen = Boolean(openMenus[section.label]);

                  return (
                    <li
                      key={section.label}
                      className={`submenu${isOpen ? " submenu-open" : ""}${
                        sectionActive ? " has-active-child" : ""
                      }`}
                    >
                      <Link
                        to="#"
                        className={isOpen ? "subdrop" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleMain(section.label);
                        }}
                      >
                        {section.icon}
                        <span>{section.label}</span>
                        <span className="menu-arrow" />
                      </Link>

                      <ul style={{ display: isOpen ? "block" : "none" }}>
                        {(section.submenuItems || []).map((item) => {
                          const childLinks = collectLinks(item.submenuItems || []);
                          const itemActive =
                            item.link === Location.pathname ||
                            childLinks.includes(Location.pathname);
                          const hasNested = Boolean(item.submenu && item.submenuItems?.length);
                          const nestedIsOpen = nestedOpen === item.label || itemActive;

                          if (hasNested) {
                            return (
                              <li
                                className={`submenu submenu-two${nestedIsOpen ? " submenu-open" : ""}`}
                                key={item.label}
                              >
                                <Link
                                  to="#"
                                  className={`${nestedIsOpen ? "subdrop" : ""}${
                                    itemActive ? " active" : ""
                                  }`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleNested(item.label);
                                  }}
                                >
                                  {item.icon}
                                  <span>{item.label}</span>
                                  <span className="menu-arrow" />
                                </Link>
                                <ul style={{ display: nestedIsOpen ? "block" : "none" }}>
                                  {item.submenuItems.map((nested) => (
                                    <li key={nested.link || nested.label}>
                                      <Link
                                        to={nested.link || "#"}
                                        className={
                                          nested.link === Location.pathname ? "active" : ""
                                        }
                                      >
                                        {nested.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            );
                          }

                          return (
                            <li key={item.link || item.label}>
                              <Link
                                to={item.link || "#"}
                                className={itemActive ? "active" : ""}
                              >
                                {item.icon}
                                <span>{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Scrollbars>
      </div>
      <HorizontalSidebar />
      <CollapsedSidebar />
    </div>
  );
};

export default Sidebar;
