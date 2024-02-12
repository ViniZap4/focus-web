import { Router, Route } from "@solidjs/router";
import { HomeScreen } from "../screens/Home";

export const RouteApp = () => {
  return (
    <Router>
      <Route path="/" component={HomeScreen} />
      <Route path="/*" component={() => <>Page not found</>} />
    </Router>
  );
};
