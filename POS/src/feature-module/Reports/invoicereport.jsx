import React, { useState } from "react";
import Breadcrumbs from "../../core/breadcrumbs";
import ImageWithBasePath from "../../core/img/imagewithbasebath";
import { Link } from "react-router-dom";
import { Filter, Sliders, StopCircle, User, Calendar } from "react-feather";
import Select from "react-select";
import DateRangePicker from "react-bootstrap-daterangepicker";

const Invoicereport = () => {
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const toggleFilterVisibility = () => {
    setIsFilterVisible((prevVisibility) => !prevVisibility);
  };

  const options = [
    { value: "sortByDate", label: "Sort by Date" },
    { value: "140923", label: "14 09 23" },
    { value: "110923", label: "11 09 23" },
  ];
  const nameOptions = [
    { value: "chooseName", label: "Choose Name" },
    { value: "rose", label: "Rose" },
    { value: "kaitlin", label: "Kaitlin" },
  ];

  const statusOptions = [
    { value: "chooseStatus", label: "Choose Status" },
    { value: "paid", label: "Paid" },
    { value: "unpaid", label: "Unpaid" },
    { value: "overdue", label: "Overdue" },
  ];

  const initialSettings = {
    endDate: new Date("2020-08-11T12:30:00.000Z"),
    ranges: {
      "Last 30 Days": [
        new Date("2020-07-12T04:57:17.076Z"),
        new Date("2020-08-10T04:57:17.076Z"),
      ],
      "Last 7 Days": [
        new Date("2020-08-04T04:57:17.076Z"),
        new Date("2020-08-10T04:57:17.076Z"),
      ],
      "Last Month": [
        new Date("2020-06-30T18:30:00.000Z"),
        new Date("2020-07-31T18:29:59.999Z"),
      ],
      "This Month": [
        new Date("2020-07-31T18:30:00.000Z"),
        new Date("2020-08-31T18:29:59.999Z"),
      ],
      Today: [
        new Date("2020-08-10T04:57:17.076Z"),
        new Date("2020-08-10T04:57:17.076Z"),
      ],
      Yesterday: [
        new Date("2020-08-09T04:57:17.076Z"),
        new Date("2020-08-09T04:57:17.076Z"),
      ],
    },
    startDate: new Date("2020-08-04T04:57:17.076Z"), // Set "Last 7 Days" as default
    timePicker: false,
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <Breadcrumbs
          maintitle="Invoice Report"
          subtitle="Manage Your Invoice Report"
        />
        {/* /product list */}
        <div className="card table-list-card">
          <div className="card-body">
            <div className="table-top">
              <div className="search-set">
                <div className="search-input">
                  <input
                    type="text"
                    placeholder="Search"
                    className="form-control form-control-sm formsearch"
                  />
                  <Link to className="btn btn-searchset">
                    <i data-feather="search" className="feather-search" />
                  </Link>
                </div>
              </div>
              <div className="search-path">
                <Link
                  className={`btn btn-filter ${
                    isFilterVisible ? "setclose" : ""
                  }`}
                  id="filter_search"
                >
                  <Filter
                    className="filter-icon"
                    onClick={toggleFilterVisibility}
                  />
                  <span onClick={toggleFilterVisibility}>
                    <ImageWithBasePath
                      src="assets/img/icons/closes.svg"
                      alt="img"
                    />
                  </span>
                </Link>
              </div>
              <div className="form-sort stylewidth">
                <Sliders className="info-img" />

                <Select
                  className="select "
                  options={options}
                  placeholder="Sort by Date"
                />
              </div>
            </div>
            {/* /Filter */}
            <div
              className={`card${isFilterVisible ? " visible" : ""}`}
              id="filter_inputs"
              style={{ display: isFilterVisible ? "block" : "none" }}
            >
              <div className="card-body pb-0">
                <div className="row">
                  <div className="col-lg-3 col-sm-6 col-12">
                    <div className="input-blocks">
                      <User className="info-img" />
                      <Select className="select" options={nameOptions} />
                    </div>
                  </div>
                  <div className="col-lg-3 col-sm-6 col-12">
                    <div className="input-blocks">
                      <StopCircle className="info-img" />
                      <Select className="select" options={statusOptions} />
                    </div>
                  </div>
                  <div className="col-lg-3 col-sm-6 col-12">
                    <div className="input-blocks">
                      <div className="position-relative daterange-wraper">
                        {/* <input
                          type="text"
                          className="form-control"
                          name="datetimes"
                          placeholder="From Date - To Date"
                        />
                        <i
                          data-feather="calendar"
                          className="feather-14 info-img"
                        /> */}
                        <Calendar className="feather-14 info-img" />

                        <DateRangePicker initialSettings={initialSettings}>
                          <input
                            className="form-control col-4 input-range"
                            type="text"
                            style={{ border: "none" }}
                          />
                        </DateRangePicker>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-sm-6 col-12">
                    <div className="input-blocks">
                      <a className="btn btn-filters ms-auto">
                        {" "}
                        <i
                          data-feather="search"
                          className="feather-search"
                        />{" "}
                        Search{" "}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Filter */}
            <div className="table-responsive">
              <table className="table  datanew">
                <thead>
                  <tr>
                    <th className="no-sort">
                      <label className="checkboxs">
                        <input type="checkbox" id="select-all" />
                        <span className="checkmarks" />
                      </label>
                    </th>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Amount Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV001</td>
                    <td>Thomas</td>
                    <td>19 Jan 2023</td>
                    <td>$1000</td>
                    <td>$1000</td>
                    <td>$0.00</td>
                    <td>
                      <span className="badge badge-linesuccess">Paid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV002</td>
                    <td>Rose</td>
                    <td>25 Jan 2023</td>
                    <td>$1500</td>
                    <td>$0.00</td>
                    <td>$1500</td>
                    <td>
                      <span className="badge badge-linedanger">Unpaid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV003</td>
                    <td>Benjamin</td>
                    <td>05 Feb 2023</td>
                    <td>$1800</td>
                    <td>$1800</td>
                    <td>$0.00</td>
                    <td>
                      <span className="badge badge-linesuccess">Paid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV004</td>
                    <td>Kaitlin</td>
                    <td>15 Feb 2023</td>
                    <td>$2000</td>
                    <td>$1000</td>
                    <td>$1000</td>
                    <td>
                      <span className="badge badges-warning">Overdue</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV005</td>
                    <td>Lilly</td>
                    <td>18 Mar 2023</td>
                    <td>$800</td>
                    <td>$800</td>
                    <td>$0.00</td>
                    <td>
                      <span className="badge badge-linesuccess">Paid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV006</td>
                    <td>Freda</td>
                    <td>24 Mar 2023</td>
                    <td>$750</td>
                    <td>$0.00</td>
                    <td>$750</td>
                    <td>
                      <span className="badge badge-linedanger">Unpaid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV007</td>
                    <td>Alwin</td>
                    <td>12 Apr 2023</td>
                    <td>$1300</td>
                    <td>$1300</td>
                    <td>$0.00</td>
                    <td>
                      <span className="badge badge-linesuccess">Paid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV008</td>
                    <td>Maybelle</td>
                    <td>24 Apr 2023</td>
                    <td>$1100</td>
                    <td>$1100</td>
                    <td>$0.00</td>
                    <td>
                      <span className="badge badge-linesuccess">Paid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV009</td>
                    <td>Ellen</td>
                    <td>03 May 2023</td>
                    <td>$2300</td>
                    <td>$2300</td>
                    <td>$0.00</td>
                    <td>
                      <span className="badge badge-linesuccess">Paid</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="checkboxs">
                        <input type="checkbox" />
                        <span className="checkmarks" />
                      </label>
                    </td>
                    <td>INV010</td>
                    <td>Grace</td>
                    <td>29 May 2023</td>
                    <td>$1700</td>
                    <td>$1700</td>
                    <td>$0.00</td>
                    <td>
                      <span className="badge badge-linesuccess">Paid</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* /product list */}
      </div>
    </div>
  );
};

export default Invoicereport;
