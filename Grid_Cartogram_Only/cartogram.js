/* SF / On Location
   Practice 1: Dynamic Color Scale Encoding (Baseline without Tooltip)
   D3 pipeline: CSV -> filter -> rollup -> keyed SVG joins -> linked views. */
const districts = [
  { id: "1", col: 0, row: 1 },
  { id: "2", col: 1, row: 0 },
  { id: "3", col: 3, row: 0 },
  { id: "4", col: 0, row: 2 },
  { id: "5", col: 1, row: 1 },
  { id: "6", col: 3, row: 1 },
  { id: "7", col: 0, row: 3 },
  { id: "8", col: 1, row: 2 },
  { id: "9", col: 2, row: 2 },
  { id: "10", col: 3, row: 3 },
  { id: "11", col: 1, row: 3 },
];
const state = {
  rows: [],
  filtered: [],
  district: null,
  limit: 12,
  color: null,
};
const fmt = new Intl.NumberFormat("en-US");
const valid = new Set(districts.map((d) => d.id));
const $ = (id) => document.getElementById(id);
const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
  ? 0
  : 250;
const titleCount = (rows) =>
  new Set(rows.map((d) => JSON.stringify([d.Title, d.year]))).size;

// Load local data. Empty or invalid district values remain excluded.
d3.csv("./data/Film_Locations_in_San_Francisco_20261021.csv")
  .then((rows) => {
    state.rows = rows.map((d, i) => ({
      ...d,
      key: i,
      year: d["Release Year"].trim(),
      district: String(Number(d["Supervisor District"])),
    }));
    const totals = d3.rollup(
      state.rows.filter((d) => valid.has(d.district)),
      (v) => v.length,
      (d) => d.district,
    );
    const max = d3.max(totals.values()) || 1;

    
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
      state.district = null;
      state.limit = 12;
      render();
    });
    $("clear").addEventListener("click", () => choose(null));
    $("more").addEventListener("click", () => {
      state.limit += 12;
      details();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        choose(null);
      }
    });
    legend(max);
    render();
  })
  .catch((error) => {
    console.error(error);
    $("status").textContent =
      "Unable to load the archive. Open this folder with Live Server and check the CSV path.";
  });

function render() {
  const q = $("search").value.trim().toLowerCase(),
    year = $("year").value;
  const matches = state.rows.filter(
    (d) =>
      (year === "all" || d.year === year) &&
      (!q || `${d.Title} ${d.Locations}`.toLowerCase().includes(q)),
  );
  state.filtered = matches.filter((d) => valid.has(d.district));
  const counts = d3.rollup(
    state.filtered,
    (v) => v.length,
    (d) => d.district,
  );
  const data = districts.map((d) => ({ ...d, count: counts.get(d.id) || 0 }));
  $("records").textContent = fmt.format(state.filtered.length);
  $("productions").textContent = fmt.format(titleCount(state.filtered));
  $("active").textContent = data.filter((d) => d.count > 0).length + " / 11";
  $("excluded").textContent =
    `${fmt.format(matches.length - state.filtered.length)} matching records excluded: no valid district.`;
  $("status").textContent =
    `${year === "all" ? "All release years" : year}${q ? " · Search: " + $("search").value.trim() : ""} · Select a tile to explore its records.`;
  drawMap(data);
  updateSelection();
  details();
}

function choose(id) {
  state.district = state.district === id ? null : id;
  state.limit = 12;
  updateSelection();
  details();
}

function updateSelection() {
  d3.selectAll(".tile")
    .classed("selected", (d) => d.id === state.district)
    .attr("aria-pressed", (d) => String(d.id === state.district));
  $("clear").hidden = !state.district;
}


function events(selection) {
  selection
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr(
      "aria-label",
      (d) =>
        `District ${d.id}: ${d.count} location records. Select to explore.`,
    )
    .on("click", (e, d) => choose(d.id))
    .on("keydown", (e, d) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(d.id);
      }
    });
}

function drawMap(data) {
  const svg = d3.select("#chart");
  svg
    .selectAll(".north")
    .data([0])
    .join("text")
    .attr("class", "north")
    .attr("x", 550)
    .attr("y", 32)
    .attr("font-size", 11)
    .attr("fill", "#647673")
    .text("N ↑");
  const tiles = svg
    .selectAll(".tile")
    .data(data, (d) => d.id)
    .join((enter) => {
      const g = enter.append("g").attr("class", "tile");
      g.append("rect").attr("width", 112).attr("height", 112).attr("rx", 2);
      g.append("text")
        .attr("class", "district-label")
        .attr("x", 14)
        .attr("y", 24)
        .attr("font-size", 11)
        .attr("letter-spacing", 1);
      g.append("text")
        .attr("class", "count-label")
        .attr("x", 14)
        .attr("y", 68)
        .attr("font-size", 31)
        .attr("font-weight", 500);
      g.append("text")
        .attr("class", "unit")
        .attr("x", 14)
        .attr("y", 89)
        .attr("font-size", 10)
        .text("location records");
      g.append("text")
        .attr("class", "selection-mark")
        .attr("x", 94)
        .attr("y", 24)
        .attr("font-size", 13)
        .text("●");
      return g;
    })
    .attr(
      "transform",
      (d) => `translate(${38 + d.col * 124},${17 + d.row * 124})`,
    );
  events(tiles);
  
  
  tiles
    .select("rect")
    .interrupt()
    .transition()
    .duration(duration)
    .attr("fill", (d) => (d.count ? state.color(d.count) : "#f0f0f0"));
  tiles
    .selectAll("text")
    .attr("fill", (d) =>
      d.count && d3.lab(state.color(d.count)).l < 55 ? "#fffdf5" : "#222222",
    );
  tiles
    .select(".district-label")
    .text((d) => "DISTRICT " + d.id.padStart(2, "0"));
  tiles.select(".count-label").text((d) => fmt.format(d.count));
}

function legend(max) {
  const root = d3.select("#legend");
  root
    .append("div")
    .attr("class", "legend-line")
    .html(
      '<span class="swatch"></span> No records <span style="margin-left:16px">LOCATION RECORDS · FIXED SCALE</span>',
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
    .filter((d) => !state.district || d.district === state.district)
    .sort((a, b) => +b.year - +a.year || a.Title.localeCompare(b.Title));
  $("detail-title").textContent = state.district
    ? "District " + state.district.padStart(2, "0")
    : "All districts";
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
  cards
    .select(".year")
    .text(
      (d) =>
        `${d.year || "Unknown year"} / DISTRICT ${d.district.padStart(2, "0")}`,
    );
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
        "No matching records. Try another year, clear the district, or change your search.",
      );
  $("more").hidden = rows.length <= state.limit;
}