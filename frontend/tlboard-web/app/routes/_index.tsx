import { Link } from "react-router";

export default function IndexRoute() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Rubydraw</h1>
      <p>
        <Link to="/b/demo">Open demo board</Link>
      </p>
      <p>
        <Link to="/board">Legacy board</Link>
      </p>
    </main>
  );
}
