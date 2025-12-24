import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("home", "routes/home.tsx"),
  route("board", "routes/board.tsx"),
  route("b/:boardId", "routes/b.$boardId.tsx"),
] satisfies RouteConfig;
