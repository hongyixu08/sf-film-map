# SF / On Location — Neighborhood Grid Cartogram

This modifies the supplied index.html, styles.css and cartogram.js rather than introducing a framework. The original theme, palette, filters, tooltip, archive cards and load-more interaction remain. No ranking chart is added.

## Run in VS Code

1. Unzip the complete project.
2. Open its folder in VS Code.
3. Right-click index.html and choose Open with Live Server.

Alternative: run `python3 -m http.server 8000` in this folder and open http://localhost:8000. Do not open through file://. D3 and all data files are local; no npm installation, API key or network access is needed at runtime.

## What changed

- Grouping changed from Supervisor District to Analysis Neighborhood.
- One equal-sized square represents one DataSF analysis neighborhood.
- A connected mainland cell silhouette is derived from the analysis-area geometry; geographic representative points are assigned to grid cells using a minimum-displacement assignment. Treasure Island uses a detached northeast tile inset.
- A linked reference map shows the actual analysis-area shapes. Hover or select either view to locate the same neighborhood in the other view.
- Search now matches neighborhood names as well as film titles and locations.
- Click a tile or reference region to filter the archive. View records scrolls to its cards. Click again, use Clear neighborhood, or press Escape to deselect. Enter/Space selects a focused area.
- On small screens the grid can scroll horizontally; the reference appears below it.

## Counts and data meaning

The original CSV has 2,214 location-record rows. There are 40 nonempty named neighborhoods in the CSV. All match the geometry dataset; 2,070 records are mapped, while 144 rows without a neighborhood are excluded and reported. Missing neighborhood values are not inferred from coordinates or district IDs.

The DataSF analysis-area dataset contains 41 areas. Visitacion Valley has no records in this CSV, so it stays visible with a count of zero. Zero is not a claim that filming never occurred there. When filters are applied, gray indicates no matching records for those filters.

One row is one filming-location entry, not one unique film or unique address. The archive continues to show source rows and may repeat titles. Film/TV title counts are deduplicated by Title + Release Year within the mapped filtered rows. Years mean release years, not filming years.

The original pink-ended palette and square-root color encoding remain. The fixed color domain is based on full-dataset neighborhood totals (maximum 299); the same color therefore keeps the same numerical meaning across filters. Tile area represents one area, not record count or land area.

## Geographic interpretation

Source: DataSF Analysis Neighborhoods, dataset j2bu-swwd, downloaded 2026-10-26.
https://data.sf.gov/-/Analysis-Neighborhoods/j2bu-swwd/explore
https://data.sf.gov/resource/j2bu-swwd.geojson

These 41 areas aggregate census tracts for analysis. They are not legally defined neighborhood boundaries and should not be interpreted as universally agreed local boundaries.

The reference geometry is simplified slightly for display. Layout generation uses the original geometry: sample square-cell centers within the mainland union, choose a connected 40-cell mask that approximates the city footprint, and assign each mainland area to one cell by minimizing squared geographic displacement using a Hungarian assignment. This is a heuristic schematic; it does not preserve all actual adjacency relationships, areas or distances. The island inset is explicitly not at true distance. See data/neighborhood-layout.json for positions, representative coordinates and method.

## Code structure

- Promise.all loads the CSV, the layout JSON and the GeoJSON.
- render filters source rows, then d3.rollup counts them by neighborhood.
- drawMap binds neighborhood names to equal SVG squares using a keyed join.
- drawReference uses d3.geoMercator and d3.geoPath for the geographic map.
- Shared neighborhood selection and hover state link both maps and the archive.
- legend samples the same color scale used by both views.
- details preserves the original row-based archive and sorts by release year.

## Files to replace

Use the whole folder. In addition to the three application files, this revision needs data/neighborhood-layout.json and data/neighborhoods.geojson. Keep the original CSV filename and vendor/d3.min.js paths.

Existing walkthroughs or presentation scripts describing eleven districts are now outdated: describe Analysis Neighborhood, 41 displayed areas and 40 areas with records instead.

D3 v7.9.0 license: vendor/LICENSE.

## Neighborhood Walkthrough

Open Walkthrough.html with Live Server for the English presentation and workshop. It follows the linked original walkthrough structure while correcting the grouping, counts, layout explanation and linked-view behavior. It includes two independent iframe previews, the dataset download, and two same-page tasks with code-oriented hints rather than replacement code.

The full reference website already has tooltips. walkthrough-baseline.html hides the hover panel for presentation only; it is not a code-free starter implementation. Participants should build their own baseline from the dataset using Copilot. Share the walkthrough page and CSV rather than distributing this presenter package as student starter code.

The embedded previews stack maps to fit the presentation; scroll inside each preview to see its reference map and archive, or open the full website.
