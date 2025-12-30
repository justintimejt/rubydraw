import { Link } from "react-router";

export default function IndexRoute() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Rubydraw</h1>
      <p>
        <Link to="/board">Open board</Link>
      </p>
    </main>
  );
}
