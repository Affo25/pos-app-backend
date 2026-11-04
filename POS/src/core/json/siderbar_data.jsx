import React from "react";
import * as Icon from "react-feather";

/**
 * Collapsible main menus with nested submenu items (API-backed screens only).
 */
export const SidebarData = [
  {
    label: "Dashboard",
    icon: <Icon.Grid />,
    link: "/",
    submenu: false,
    showSubRoute: false,
  },
  {
    label: "Inventory",
    icon: <Icon.Package />,
    submenu: true,
    submenuOpen: true,
    showSubRoute: false,
    submenuItems: [
      {
        label: "Products",
        link: "/product-list",
        icon: <Icon.Box />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Create Product",
        link: "/add-product",
        icon: <Icon.PlusSquare />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Stock Management",
        link: "/manage-stocks",
        icon: <Icon.Database />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Category",
        link: "/category-list",
        icon: <Icon.Codepen />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Sub Category",
        link: "/sub-categories",
        icon: <Icon.Layers />,
        showSubRoute: false,
        submenu: false,
      },
    ],
  },
  {
    label: "Sales",
    icon: <Icon.ShoppingCart />,
    submenu: true,
    submenuOpen: true,
    showSubRoute: false,
    submenuItems: [
      {
        label: "POS / Sell",
        link: "/pos",
        icon: <Icon.Monitor />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Sales",
        link: "/sales-list",
        icon: <Icon.ShoppingBag />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Sales Return",
        link: "/sales-returns",
        icon: <Icon.Copy />,
        showSubRoute: false,
        submenu: false,
      },
    ],
  },
  {
    label: "Purchases",
    icon: <Icon.Truck />,
    submenu: true,
    submenuOpen: true,
    showSubRoute: false,
    submenuItems: [
      {
        label: "Purchase Orders",
        link: "/purchase-list",
        icon: <Icon.ShoppingBag />,
        showSubRoute: false,
        submenu: false,
      },
    ],
  },
  {
    label: "People",
    icon: <Icon.Users />,
    submenu: true,
    submenuOpen: true,
    showSubRoute: false,
    submenuItems: [
      {
        label: "Customers",
        link: "/customers",
        icon: <Icon.User />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Suppliers",
        link: "/suppliers",
        icon: <Icon.UserPlus />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Branches",
        link: "/store-list",
        icon: <Icon.Home />,
        showSubRoute: false,
        submenu: false,
      },
    ],
  },
  {
    label: "Finance",
    icon: <Icon.DollarSign />,
    submenu: true,
    submenuOpen: false,
    showSubRoute: false,
    submenuItems: [
      {
        label: "Payments",
        link: "/payments",
        icon: <Icon.CreditCard />,
        showSubRoute: false,
        submenu: false,
      },
    ],
  },
  {
    label: "User Management",
    icon: <Icon.Shield />,
    submenu: true,
    submenuOpen: false,
    showSubRoute: false,
    submenuItems: [
      {
        label: "Users",
        link: "/users",
        icon: <Icon.UserCheck />,
        showSubRoute: false,
        submenu: false,
      },
      {
        label: "Roles & Permissions",
        link: "/roles-permissions",
        icon: <Icon.Lock />,
        showSubRoute: false,
        submenu: false,
      },
    ],
  },
  {
    label: "Settings",
    icon: <Icon.Settings />,
    submenu: true,
    submenuOpen: false,
    showSubRoute: false,
    submenuItems: [
      {
        label: "Invoice & branding",
        link: "/general-settings",
        icon: <Icon.Sliders />,
        showSubRoute: false,
        submenu: false,
      },
    ],
  },
];
