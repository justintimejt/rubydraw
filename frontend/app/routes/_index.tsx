import { Link } from "react-router";

export default function IndexRoute() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff",
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "40px 20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "800px",
          width: "100%",
        }}
      >
        <img
          src="/boardpreview.jpeg"
          alt="Board Preview"
          className="rounded-xl shadow-lg object-contain"
          style={{
            display: "block",
            margin: "0 auto",
            width: "85%",
            maxWidth: "750px",
          }}
        />
        <h1 className="relative text-2xl md:text-4xl font-serif font-medium mb-3 text-neutral-700 text-pretty" style={{ paddingTop: "40px" }}>
          Turn Rough Sketches Into Stunning Drawings
        </h1>

          <div className="relative font-medium text-neutral-500 mb-8 md:text-lg leading-relaxed">
          Ruby Draw is tldraw for your creative ideas.
          <br />
          Create beautiful drawings from your roughest sketches in seconds.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Link
            to="/board"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px 32px",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              textDecoration: "none",
              color: "#111827",
              fontWeight: 700,
              fontSize: "18px",
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Pencil/Draw icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M12 19L19 12L22 15L15 22L12 19Z"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18 13L16.5 5.5L2 2L5.5 16.5L13 18L18 13Z"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 2L7.586 7.586"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 11L17 7"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Start Drawing</span>
          </Link>

          <p
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              margin: 0,
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            *no signup required
          </p>
        </div>
      </div>
    </main>
  );
}
