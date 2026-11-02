import React, { useEffect, useMemo, useState } from "react";
import Scrollbars from "react-custom-scrollbars-2";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { SidebarData } from "../../core/json/siderbar_data";
import HorizontalSidebar from "./horizontalSidebar";
import CollapsedSidebar from "./collapsedSidebar";
import { getApiBase } from "../../config/runtimeConfig";
import { resolveUploadUrl } from "../../utils/invoicePrint";

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
  const settings = useSelector((state) => state.settings?.settings);
  const sidebarBrand = useMemo(() => {
    const design = settings?.invoiceDesign || {};
    return {
      logo: resolveUploadUrl(design.sidebarLogoUrl || design.logoUrl, getApiBase()),
      name: design.companyName || "",
    };
  }, [settings]);

  const initialOpen = useMemo(() => {
    const open = {};
    SidebarData.forEach((section) => {
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

  return (
    <div>
      <div className="sidebar" id="sidebar">
        <Scrollbars>
          <div className="sidebar-inner slimscroll">
            <div id="sidebar-menu" className="sidebar-menu">
              {sidebarBrand.logo || sidebarBrand.name ? (
                <div className="sidebar-brand-block">
                  {sidebarBrand.logo ? (
                    <img src={sidebarBrand.logo} alt="" className="sidebar-brand-logo" />
                  ) : null}
                  {sidebarBrand.name ? (
                    <span className="sidebar-brand-name">{sidebarBrand.name}</span>
                  ) : null}
                </div>
              ) : null}
              <ul>
                {SidebarData.map((section) => {
                  const sectionLinks = collectLinks(section.submenuItems || []);
                  const sectionActive = sectionLinks.includes(Location.pathname);
                  const isOpen = Boolean(openMenus[section.label]);

                  return (
                    <li
                      key={section.label}
                      className={`submenu${isOpen ? " submenu-open" : ""}${
                        sectionActive ? " active" : ""
                      }`}
                    >
                      <Link
                        to="#"
                        className={`${isOpen ? "subdrop" : ""}${sectionActive ? " active" : ""}`}
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
