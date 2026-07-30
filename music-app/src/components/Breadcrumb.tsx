import { Link } from "react-router-dom";

export default function Breadcrumb({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 13, opacity: 0.65, marginBottom: 6 }}>
      <Link to="/" style={{ color: "inherit", textDecoration: "none", display: "inline-block", padding: "8px 0" }}>Home</Link>
      <span style={{ margin: "0 6px" }}>›</span>
      {label}
    </nav>
  );
}
