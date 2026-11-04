import React from "react";

const formatMoney = (value, prefix = "Rs") =>
  `${prefix} ${Number(value || 0).toFixed(2)}`;

/**
 * Pill badge for table values (money, qty, ids, dates).
 * tone: neutral | ok | warn | danger | info | muted
 */
const CrudValueBadge = ({
  children,
  value,
  tone = "neutral",
  variant = "text",
  prefix = "Rs",
  className = "",
}) => {
  let content = children;
  if (content == null && value != null) {
    if (variant === "money") content = formatMoney(value, prefix);
    else if (variant === "qty") content = String(value);
    else content = String(value);
  }
  return (
    <span className={`mc-value-badge is-${variant} is-${tone} ${className}`.trim()}>
      {content}
    </span>
  );
};

export const MoneyBadge = ({ value, tone = "info", prefix = "Rs", className }) => (
  <CrudValueBadge value={value} variant="money" tone={tone} prefix={prefix} className={className} />
);

export const QtyBadge = ({ value, tone = "neutral", className }) => (
  <CrudValueBadge value={value} variant="qty" tone={tone} className={className} />
);

export const IdBadge = ({ value, tone = "muted", className }) => (
  <CrudValueBadge value={value} variant="id" tone={tone} className={className} />
);

export default CrudValueBadge;
