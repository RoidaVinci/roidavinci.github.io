// Entry point for the visualization toolkit. Importing a tool module
// registers it; mountAll() then instantiates every `[data-viz]` element on
// the page. To add a tool: create assets/js/viz/tools/<name>.js that calls
// register("<name>", factory), import it here, and embed <div data-viz="<name>">
// in any page.

import { mountAll } from "./toolkit.js";
import "./tools/gradient-descent.js";
import "./tools/fourier-series.js";
import "./tools/feynman-kac.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => mountAll());
} else {
  mountAll();
}
