import React from "react";
import PropTypes from "prop-types";
import { base_path } from "../../environment";

const ImageWithBasePath = (props) => {
  const src = props.src || "";
  const isAbsolute =
    /^https?:\/\//i.test(src) ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("//");
  const fullSrc = isAbsolute ? src : `${base_path}${src}`;

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
