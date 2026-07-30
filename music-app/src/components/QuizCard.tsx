import { Link } from "react-router-dom";
import { black, blue, white } from "../utils/theme";

type Props = {
  to: string;
  title: string;
  tag: string;
  desc: string;
  accent?: (a: number) => string;
};

export default function QuizCard({ to, title, tag, desc, accent = blue }: Props) {
  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          borderRadius: 14,
          padding: "1.25rem",
          background: white(0.06),
          border: `1px solid ${white(0.12)}`,
          cursor: "pointer",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${black(0.2)}`;
          (e.currentTarget as HTMLElement).style.border = `1px solid ${accent(0.35)}`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "";
          (e.currentTarget as HTMLElement).style.boxShadow = "";
          (e.currentTarget as HTMLElement).style.border = `1px solid ${white(0.12)}`;
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
          {tag}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{title}</div>
        <div style={{ opacity: 0.65, fontSize: 14, lineHeight: 1.6, flex: 1 }}>{desc}</div>
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: accent(0.9) }}>
          Start →
        </div>
      </div>
    </Link>
  );
}
