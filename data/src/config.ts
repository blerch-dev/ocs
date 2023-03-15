import { formatDB, alterDB } from "./data";

alterDB().then((output) => {
    console.log(output);
});