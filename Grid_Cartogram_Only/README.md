# SF / On Location

Open this folder in VS Code. Right-click index.html and choose Open with Live Server.
Do not double-click index.html: CSV loading requires a local HTTP server.
Alternative: run `python3 -m http.server 8000` here and open http://localhost:8000.

All assets, including D3 7.9.0 and the supplied CSV, are local. No build step or external network is needed.

## Explore

- Choose a release year or search by title/location.
- Click a district tile to filter archive records. Click again to deselect.
- Tab to tiles and press Enter or Space; Escape clears the district.
- Reset restores all filters; Load more reveals 12 additional records.

## Explain the D3 code

1. d3.csv loads local rows.
2. Array.filter applies year and text filters.
3. d3.rollup counts records by district.
4. Keyed .data(...).join(...) connects district objects to SVG tiles.
5. A fixed square-root color scale supports comparisons between filters.
6. Shared selection state links the grid map and archive.
7. D3 transitions animate updates, respecting reduced-motion preferences.

## Data and limitations

One row means one location record, not one film. Film/TV titles are deduplicated by title + release year. All views exclude records without a valid district (the excluded count is shown). Years refer to release. Tiles are equal-sized and manually positioned: this schematic is not a district-boundary map and does not guarantee all geographic adjacencies. No neighborhood names or boundaries are inferred. The color domain uses all-year district totals and stays fixed.

D3 is distributed under its ISC license; see vendor/LICENSE.

## Grid-only layout

The Compare panel and its chart code have been removed. The cartogram is centered in a full-width panel. Click a tile to update The Archive below. Filters, tooltips, keyboard controls and local CSV loading remain available.
