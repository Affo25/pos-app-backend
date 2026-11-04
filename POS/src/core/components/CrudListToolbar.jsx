import React from "react";
import { Filter, Search, X } from "feather-icons-react/build/IconComponents";

/**
 * Search + optional status filter + optional date chips + Filters button / stock tabs.
 */
const CrudListToolbar = ({
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  totalRecords,
  filterLabel,
  filterValue,
  filterOptions = [],
  onFilterChange,
  tabs = [],
  activeTab,
  onTabChange,
  showFiltersButton = false,
  filtersOpen = false,
  onToggleFilters,
  stockFilterValue,
  stockFilterOptions = [],
  onStockFilterChange,
  dateMode,
  onDateModeChange,
  dateOptions = [
    { value: "today", label: "Today" },
    { value: "range", label: "Range" },
    { value: "all", label: "All" },
  ],
  rangeFrom = "",
  rangeTo = "",
  onRangeFromChange,
  onRangeToChange,
}) => (
  <>
    <div className="modern-crud-toolbar">
      <div className="modern-crud-search">
        <Search size={16} className="modern-crud-search-icon" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={searchPlaceholder}
        />
      </div>
      <div className="modern-crud-toolbar-actions">
        {typeof onDateModeChange === "function" && dateOptions.length ? (
          <div className="sale-date-filters is-inline" role="group" aria-label="Date filter">
            {dateOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`sale-date-chip${dateMode === opt.value ? " active" : ""}`}
                onClick={() => onDateModeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            {dateMode === "range" ? (
              <div className="sale-date-range">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={rangeFrom}
                  onChange={(e) => onRangeFromChange?.(e.target.value)}
                />
                <span>to</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={rangeTo}
                  onChange={(e) => onRangeToChange?.(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {filterOptions.length ? (
          <div className="modern-crud-filter">
            <select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              aria-label={filterLabel || "Filter"}
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showFiltersButton ? (
          <button
            type="button"
            className={`modern-crud-filters-btn${filtersOpen ? " active" : ""}`}
            onClick={onToggleFilters}
          >
            {filtersOpen ? <X size={15} /> : <Filter size={15} />}
            Filters
          </button>
        ) : null}
      </div>
    </div>

    {showFiltersButton && filtersOpen && stockFilterOptions.length ? (
      <div className="modern-crud-stock-filters">
        <span className="modern-crud-stock-label">Stock status</span>
        <div className="modern-crud-stock-pills">
          {stockFilterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`modern-crud-stock-pill${
                stockFilterValue === opt.value ? " active" : ""
              }${opt.tone ? ` is-${opt.tone}` : ""}`}
              onClick={() => onStockFilterChange(opt.value)}
            >
              {opt.label}
              {typeof opt.count === "number" ? <span>{opt.count}</span> : null}
            </button>
          ))}
        </div>
      </div>
    ) : null}

    {tabs.length ? (
      <div className="modern-crud-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`modern-crud-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className={`modern-crud-tab-count${tab.tone ? ` is-${tab.tone}` : ""}`}>
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    ) : null}
  </>
);

export default CrudListToolbar;
