import React from "react";
import PropTypes from "prop-types";
import { base_path } from "../../environment";
import { getApiBase } from "../../config/runtimeConfig";

const ImageWithBasePath = (props) => {
  const src = props.src || "";
  const isAbsolute =
    /^https?:\/\//i.test(src) ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("//");
  const isApiAsset =
    src.startsWith("/uploads/") ||
    src.startsWith("/api/") ||
    src.includes("/api/uploads/");
  const apiOrigin = getApiBase().replace(/\/api\/?$/, "");
  const fullSrc = isAbsolute
    ? src
    : isApiAsset
      ? `${apiOrigin}${src.startsWith("/") ? src : `/${src}`}`
      : `${base_path}${src}`;

  return (
    <img
      className={props.className}
      src={fullSrc}
      height={props.height}
      alt={props.alt}
      width={props.width}
      id={props.id}
      style={props.style}
    />
  );
};

ImageWithBasePath.propTypes = {
  className: PropTypes.string,
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  height: PropTypes.number,
  width: PropTypes.number,
  id: PropTypes.string,
  style: PropTypes.object,
};

export default ImageWithBasePath;
