import { Link } from "react-router";

export default function IndexRoute() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        backgroundImage: `radial-gradient(circle, #1a1a1a 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: '"Tiempos", "Tiempos Headline", Georgia, "Times New Roman", serif',
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "800px",
          width: "100%",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "24px",
            letterSpacing: "-0.02em",
          }}
        >
          Turn Ideas into
          <br />
          <span style={{ fontSize: "1.2em" }}>Stunning Drawings</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            lineHeight: 1.6,
            marginBottom: "40px",
            opacity: 0.9,
            maxWidth: "600px",
            margin: "0 auto 40px",
          }}
        >
          Ruby Draw is <strong>tldraw</strong> for your creative ideas. Create
          beautiful drawings from your roughest sketches in seconds.
        </p>

        <Link
          to="/board"
          style={{
            display: "inline-block",
            padding: "14px 32px",
            background: "#ffffff",
            color: "#000000",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "16px",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 4px 12px rgba(255, 255, 255, 0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 255, 255, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 255, 255, 0.1)";
          }}
        >
          Start Drawing
        </Link>
      </div>
    </main>
  );
}
