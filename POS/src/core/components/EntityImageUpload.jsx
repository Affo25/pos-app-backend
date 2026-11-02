import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Image as ImageIcon, X } from "feather-icons-react/build/IconComponents";
import { toast } from "react-toastify";
import { resolveMediaUrl, uploadMedia } from "../../redux/utils/uploadMedia";

/**
 * Compact drag/drop image uploader used in modern CRUD modals.
 */
const EntityImageUpload = ({
  value,
  onChange,
  folder = "misc",
  label = "Photo",
  hint = "JPG, PNG — optional",
}) => {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const preview = resolveMediaUrl(value);

  const handleFile = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, folder);
      onChange?.(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-3">
      {label ? <label className="modern-form-label">{label}</label> : null}
      <div
        className={`modern-image-upload is-compact${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          disabled={uploading}
        />
        {preview ? (
          <img src={preview} alt="Preview" className="modern-image-upload-preview" />
        ) : (
          <div className="modern-image-upload-placeholder">
            <ImageIcon size={24} />
            <strong>Upload image</strong>
            <span>Drag & drop or click to browse</span>
            <small className="d-block mt-1">{hint}</small>
          </div>
        )}
        {preview ? (
          <div className="modern-image-upload-actions">
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={uploading}
            >
              Change
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange?.("");
              }}
              disabled={uploading}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}
        {uploading ? <div className="modern-image-upload-busy">Uploading…</div> : null}
      </div>
    </div>
  );
};

EntityImageUpload.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  folder: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
};

export default EntityImageUpload;
