// Default Layout/Route for ocs.gg
import { OCRoute, OCRequest } from "ocs-type";
import { defaultLayout } from "../components/layout";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*'
});

export default DefaultRoute;
