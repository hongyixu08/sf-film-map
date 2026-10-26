/* SF / On Location — neighborhood extension of the original project.
   CSV -> filter -> rollup by Analysis Neighborhood -> keyed SVG joins.
   Layout and geographic reference are local files generated from DataSF areas. */
let neighborhoods = [];
let boundaries = null;
const state = {
  rows: [],
  filtered: [],
  neighborhood: null,
  limit: 12,
  color: null,
  hovered: null,
};
const fmt = new Intl.NumberFormat("en-US");
const $ = (id) => document.getElementById(id);
const tooltip = d3.select("#tooltip");
const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
  ? 0
  : 250;
const titleCount = (rows) =>
  new Set(rows.map((d) => JSON.stringify([d.Title, d.year]))).size;
const valid = new Set();
const TILE = 96,
  STEP = 100,
  PAD = 18;
let gridData = [];

// Preserve the CSV's supplied neighborhood classifications; do not infer missing ones.
Promise.all([
  d3.csv("./data/Film_Locations_in_San_Francisco_20261021.csv"),
  d3.json("./data/neighborhood-layout.json"),
  d3.json("./data/neighborhoods.geojson"),
])
  .then(([rows, layout, geography]) => {
    neighborhoods = layout.neighborhoods;
    boundaries = geography;
    neighborhoods.forEach((d) => valid.add(d.name));
    state.rows = rows.map((d, i) => ({
      ...d,
      key: i,
      year: (d["Release Year"] || "").trim(),
      neighborhood: (d["Analysis Neighborhood"] || "").trim(),
    }));
    const totals = d3.rollup(
      state.rows.filter((d) => valid.has(d.neighborhood)),
      (v) => v.length,
      (d) => d.neighborhood,
    );
    const max = d3.max(totals.values()) || 1;
    // Retain the original project's palette and fixed-domain square-root encoding.
    state.color = d3
      .scaleSequentialSqrt(d3.interpolateRgb("#e5eed5", "#efacd5"))
      .domain([0, max]);
    d3.select("#year")
      .selectAll("option.year")
      .data(
        [...new Set(state.rows.map((d) => d.year).filter(Boolean))].sort(
          (a, b) => +b - +a,
        ),
      )
      .join("option")
      .attr("class", "year")
      .attr("value", (d) => d)
      .text((d) => d);
    document
      .querySelectorAll(".controls input,.controls select,.controls button")
      .forEach((el) => (el.disabled = false));
    $("year").addEventListener("change", () => {
      state.limit = 12;
      render();
    });
    $("search").addEventListener("input", () => {
      state.limit = 12;
      render();
    });
    $("reset").addEventListener("click", () => {
      $("year").value = "all";
      $("search").value = "";
      state.neighborhood = null;
      state.limit = 12;
      render();
    });
    $("clear").addEventListener("click", () => choose(null));
    $("more").addEventListener("click", () => {
      state.limit += 12;
      details();
    });
    $("view-records").addEventListener("click", () => {
      $("archive").scrollIntoView({
        behavior: duration ? "smooth" : "auto",
        block: "start",
      });
      $("archive").focus({ preventScroll: true });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        choose(null);
        clearHover();
      }
    });
    legend(max);
    render();
  })
  .catch((error) => {
    console.error(error);
    $("status").textContent =
      "Unable to load local files. Open with Live Server and check the CSV, neighborhood-layout.json and neighborhoods.geojson in data/.";
  });

function render() {
  clearHover();
  const q = $("search").value.trim().toLowerCase(),
    year = $("year").value;
  const matches = state.rows.filter(
    (d) =>
      (year === "all" || d.year === year) &&
      (!q ||
        `${d.Title} ${d.Locations} ${d.neighborhood}`
          .toLowerCase()
          .includes(q)),
  );
  state.filtered = matches.filter((d) => valid.has(d.neighborhood));
  const counts = d3.rollup(
    state.filtered,
    (v) => v.length,
    (d) => d.neighborhood,
  );
  gridData = neighborhoods.map((d) => ({
    ...d,
    count: counts.get(d.name) || 0,
  }));
  $("records").textContent = fmt.format(state.filtered.length);
  $("productions").textContent = fmt.format(titleCount(state.filtered));
  $("active").textContent =
    `${gridData.filter((d) => d.count > 0).length} / ${neighborhoods.length}`;
  $("excluded").textContent =
    `${fmt.format(matches.length - state.filtered.length)} matching records excluded: no matching neighborhood.`;
  $("status").textContent =
    `${year === "all" ? "All release years" : year}${q ? " · Search: " + $("search").value.trim() : ""} · Select a neighborhood in either map to explore its records.`;
  drawMap(gridData);
  drawReference(gridData);
  updateSelection();
  details();
}

function choose(name) {
  state.neighborhood = state.neighborhood === name ? null : name;
  state.limit = 12;
  updateSelection();
  details();
}
function updateSelection() {
  d3.selectAll(".tile,.geo-neighborhood")
    .classed("selected", (d) => d.name === state.neighborhood)
    .attr("aria-pressed", (d) => String(d.name === state.neighborhood));
  $("clear").hidden = !state.neighborhood;
  $("view-records").hidden = !state.neighborhood;
  const selected = gridData.find((d) => d.name === state.neighborhood);
  $("selection-text").textContent = selected
    ? `${selected.name} · ${fmt.format(selected.count)} location records · ${titleCount(state.filtered.filter((d) => d.neighborhood === selected.name))} titles`
    : "Select a neighborhood to explore its films and locations.";
  updateReferenceCaption();
}
function updateReferenceCaption() {
  const name = state.hovered || state.neighborhood;
  $("reference-caption").textContent = name
    ? `${name} — highlighted in both views.`
    : "Hover or select either view to locate a neighborhood.";
  const active = name;
  d3.selectAll(".geo-neighborhood").classed(
    "located",
    (d) => d.name === active,
  );
  d3.select("#reference-active-label").text(active || "");
}
function clearHover() {
  state.hovered = null;
  tooltip.attr("hidden", true);
  d3.selectAll(".tile,.geo-neighborhood").classed("hovered", false);
  if ($("reference-caption")) updateReferenceCaption();
}
function showInfo(event, d) {
  state.hovered = d.name;
  d3.selectAll(".tile,.geo-neighborhood").classed(
    "hovered",
    (item) => item.name === d.name,
  );
  const share = state.filtered.length
    ? d3.format(".1%")(d.count / state.filtered.length)
    : "0%";
  tooltip
    .attr("hidden", null)
    .text(
      `${d.name} · ${fmt.format(d.count)} records · ${share} of filtered mapped records`,
    );
  const rect = event.currentTarget.getBoundingClientRect();
  positionTooltip(
    Number.isFinite(event.clientX)
      ? event
      : {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        },
  );
  updateReferenceCaption();
}
function events(selection) {
  selection
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr(
      "aria-label",
      (d) => `${d.name}: ${d.count} location records. Select to view records.`,
    )
    .on("click", (e, d) => choose(d.name))
    .on("keydown", (e, d) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(d.name);
      }
    })
    .on("pointerenter", showInfo)
    .on("pointermove", positionTooltip)
    .on("pointerleave", clearHover)
    .on("focus", showInfo)
    .on("blur", clearHover);
}
function positionTooltip(e) {
  const box = tooltip.node().getBoundingClientRect();
  tooltip
    .style(
      "left",
      `${Math.max(8, Math.min(e.clientX + 14, innerWidth - box.width - 8))}px`,
    )
    .style(
      "top",
      `${Math.max(8, Math.min(e.clientY + 16, innerHeight - box.height - 8))}px`,
    );
}
function fill(d) {
  return d.count ? state.color(d.count) : "#e5e7df";
}
function drawMap(data) {
  const svg = d3.select("#chart");
  const width = (d3.max(data, (d) => d.col) + 1) * STEP + PAD * 2;
  const height = (d3.max(data, (d) => d.row) + 1) * STEP + PAD * 2 + 45;
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg
    .selectAll(".orientation")
    .data([0])
    .join("text")
    .attr("class", "orientation")
    .attr("x", 18)
    .attr("y", height - 9)
    .text("NORTH ↑ · WEST ←   → EAST");
  const island = data.find((d) => d.island);
  svg
    .selectAll(".island-label")
    .data(island ? [island] : [])
    .join("text")
    .attr("class", "island-label")
    .attr("x", (d) => PAD + d.col * STEP)
    .attr("y", (d) => PAD + d.row * STEP + TILE + 18)
    .text("Island inset");
  const tiles = svg
    .selectAll(".tile")
    .data(data, (d) => d.name)
    .join((enter) => {
      const g = enter.append("g").attr("class", "tile");
      g.append("rect").attr("width", TILE).attr("height", TILE).attr("rx", 2);
      g.append("text")
        .attr("class", "name")
        .attr("x", 8)
        .attr("y", 16)
        .attr("font-size", 11);
      g.append("text")
        .attr("class", "count-label")
        .attr("x", 8)
        .attr("y", 72)
        .attr("font-size", 29);
      g.append("text")
        .attr("class", "unit")
        .attr("x", 8)
        .attr("y", 87)
        .attr("font-size", 9)
        .text("location records");
      g.append("title");
      return g;
    })
    .attr(
      "transform",
      (d) => `translate(${PAD + d.col * STEP},${PAD + d.row * STEP})`,
    );
  events(tiles);
  tiles
    .select("rect")
    .interrupt()
    .transition()
    .duration(duration)
    .attr("fill", fill);
  tiles.select(".name").each(function (d) {
    d3.select(this)
      .selectAll("tspan")
      .data(d.lines)
      .join("tspan")
      .attr("x", 8)
      .attr("dy", (_, i) => (i ? 13 : 0))
      .text((line) => line);
  });
  tiles.select(".count-label").text((d) => fmt.format(d.count));
  tiles.select("title").text((d) => `${d.name}: ${d.count} location records`);
  tiles.selectAll("text").attr("fill", "#243e3e");
}
function drawReference(data) {
  const svg = d3.select("#reference");
  const projection = d3.geoMercator().fitExtent(
    [
      [15, 35],
      [445, 485],
    ],
    boundaries,
  );
  const path = d3.geoPath(projection);
  const lookup = new Map(data.map((d) => [d.name, d]));
  const features = boundaries.features.map((f) => ({
    ...lookup.get(f.properties.name),
    feature: f,
  }));
  svg
    .selectAll(".ocean-label")
    .data([0])
    .join("text")
    .attr("class", "ocean-label")
    .attr("x", 18)
    .attr("y", 260)
    .attr("transform", "rotate(-90 18 260)")
    .text("PACIFIC OCEAN");
  svg
    .selectAll(".orientation")
    .data([0])
    .join("text")
    .attr("class", "orientation")
    .attr("x", 420)
    .attr("y", 22)
    .text("N ↑");
  const regions = svg
    .selectAll(".geo-neighborhood")
    .data(features, (d) => d.name)
    .join((enter) => {
      const g = enter.append("g").attr("class", "geo-neighborhood");
      g.append("path");
      return g;
    });
  regions
    .select("path")
    .attr("d", (d) => path(d.feature))
    .attr("fill", fill);
  events(regions);
  const label = svg
    .selectAll("#reference-active-label")
    .data([0])
    .join("text")
    .attr("id", "reference-active-label")
    .attr("class", "reference-label")
    .attr("x", 230)
    .attr("y", 515)
    .attr("text-anchor", "middle");
  label.text(state.neighborhood || "");
}
function legend(max) {
  const root = d3.select("#legend");
  root.selectAll("*").remove();
  root
    .append("div")
    .attr("class", "legend-line")
    .html(
      '<span class="swatch"></span> No matching records <span style="margin-left:16px">LOCATION RECORDS · FIXED SCALE</span>',
    );
  const svg = root
    .append("svg")
    .attr("class", "legend-svg")
    .attr("viewBox", "0 0 360 46");
  const scale = d3.scaleSqrt().domain([0, max]).range([1, 349]);
  svg
    .selectAll("rect")
    .data(d3.range(349))
    .join("rect")
    .attr("x", (d) => d + 1)
    .attr("y", 6)
    .attr("width", 1.1)
    .attr("height", 10)
    .attr("fill", (d) => state.color(scale.invert(d + 1)));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0,16)")
    .call(
      d3
        .axisBottom(scale)
        .tickValues([0, Math.round(max / 4), Math.round(max / 2), max])
        .tickSize(4)
        .tickFormat(d3.format(",")),
    );
}
function details() {
  const rows = state.filtered
    .filter((d) => !state.neighborhood || d.neighborhood === state.neighborhood)
    .sort(
      (a, b) =>
        +b.year - +a.year || (a.Title || "").localeCompare(b.Title || ""),
    );
  $("detail-title").textContent = state.neighborhood || "All neighborhoods";
  $("detail-description").textContent =
    `${fmt.format(rows.length)} location records · ${fmt.format(titleCount(rows))} titles · Showing ${Math.min(rows.length, state.limit)} records, newest releases first.`;
  const root = d3.select("#film-list");
  root.selectAll(".empty").remove();
  const cards = root
    .selectAll(".film")
    .data(rows.slice(0, state.limit), (d) => d.key)
    .join((enter) => {
      const c = enter.append("article").attr("class", "film");
      c.append("span").attr("class", "year");
      c.append("h3");
      c.append("p").attr("class", "place");
      c.append("p").attr("class", "meta");
      return c;
    });
  cards.order();
  cards
    .select(".year")
    .text((d) => `${d.year || "Unknown year"} / ${d.neighborhood}`);
  cards.select("h3").text((d) => d.Title || "Untitled");
  cards.select(".place").text((d) => d.Locations || "Location not specified");
  cards
    .select(".meta")
    .text((d) =>
      d.Director ? "Directed by " + d.Director : "Director not specified",
    );
  if (!rows.length)
    root
      .append("p")
      .attr("class", "empty")
      .text(
        "No matching records. Try another year, clear the neighborhood, or change your search.",
      );
  $("more").hidden = rows.length <= state.limit;
}
