const numberPattern = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?";
const numericValue = new RegExp(
  `^(${numberPattern})(?:%|\\s*pp\\/1k)?(?:\\s*±.*)?$`,
  "i",
);

export function tableNumber(value: string): number {
  const match = value.trim().match(numericValue);
  return match ? Number(match[1]) : NaN;
}

export function compareValues(a: string, b: string, numeric: boolean): number {
  if (!numeric) return a.localeCompare(b, undefined, { sensitivity: "base" });
  const x = tableNumber(a),
    y = tableNumber(b);
  if (Number.isNaN(x)) return Number.isNaN(y) ? 0 : 1;
  return Number.isNaN(y) ? -1 : x - y;
}

export function matchesFilter(
  value: string,
  query: string,
  numeric: boolean,
): boolean {
  query = query.trim();
  if (!query) return true;
  if (!numeric) return value.toLowerCase().includes(query.toLowerCase());
  const actual = tableNumber(value);
  if (Number.isNaN(actual)) return false;
  const range = query.match(
    new RegExp(`^(${numberPattern})%?\\s*\\.\\.\\s*(${numberPattern})%?$`, "i"),
  );
  if (range) return actual >= Number(range[1]) && actual <= Number(range[2]);
  const comparison = query.match(
    new RegExp(`^(>=|<=|>|<|=)?\\s*(${numberPattern})%?$`, "i"),
  );
  if (!comparison) return false;
  const target = Number(comparison[2]);
  switch (comparison[1]) {
    case ">=":
      return actual >= target;
    case "<=":
      return actual <= target;
    case ">":
      return actual > target;
    case "<":
      return actual < target;
    default:
      return actual === target;
  }
}

/** Adds column controls without replacing rows or their event handlers. */
export function enhanceTable(table: HTMLTableElement): void {
  if (table.dataset.filterable) return;
  const header = table.rows[0];
  if (!header) return;
  table.dataset.filterable = "true";
  const head = table.tHead ?? table.createTHead();
  head.append(header);
  const body = table.tBodies[0] ?? table.createTBody();
  for (const row of Array.from(table.rows)) {
    if (row !== header && row.parentElement !== body) body.append(row);
  }
  const toolbar = document.createElement("div");
  toolbar.className = "table-controls";
  const count = document.createElement("span");
  count.setAttribute("role", "status");
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset table";
  const help = document.createElement("span");
  help.className = "help";
  help.textContent =
    "Numbers: ≥ as >=10, <=20, or 5..20. Percentages use 0–100. Click headings to sort.";
  toolbar.append(count, reset, help);
  table.before(toolbar);
  const empty = document.createElement("p");
  empty.className = "table-empty help";
  table.after(empty);
  const filters = head.insertRow();
  filters.className = "table-filters";
  const columns = Array.from(header.cells).map((cell, index) => {
    const label = cell.textContent?.trim() ?? "";
    const numeric =
      cell.dataset.type === "number" ||
      !/rule|observation|tag|replay/i.test(label);
    const filterCell = document.createElement("th");
    filters.append(filterCell);
    if (/replay/i.test(label))
      return { numeric, input: null, button: null, label };
    cell.scope = "col";
    cell.setAttribute("aria-sort", "none");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-sort";
    button.textContent = label;
    button.setAttribute("aria-label", `Sort by ${label}`);
    button.onclick = () => {
      direction = sortColumn === index ? -direction : 1;
      sortColumn = index;
      apply();
    };
    cell.replaceChildren(button);
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = numeric ? "e.g. 5..20" : "Filter…";
    input.setAttribute("aria-label", `Filter ${label}`);
    input.title = numeric
      ? "Exact number, >=10, <=20, or 5..20; percentages use displayed units."
      : "Contains text (case insensitive)";
    input.addEventListener("input", () => apply());
    filterCell.append(input);
    return { numeric, input, button, label };
  });
  let sortColumn = -1,
    direction = 1,
    nextOrder = 0;
  const originalOrder = new WeakMap<HTMLTableRowElement, number>();
  const observer = new MutationObserver(() => apply());
  function cellValue(row: HTMLTableRowElement, index: number): string {
    const cell = row.cells[index];
    return cell?.querySelector("input")?.value ?? cell?.textContent ?? "";
  }
  function apply() {
    observer.disconnect();
    const rows = Array.from(body.rows);
    for (const row of rows) {
      if (!originalOrder.has(row)) originalOrder.set(row, nextOrder++);
      row.hidden = !columns.every(
        (column, index) =>
          !column.input ||
          matchesFilter(
            cellValue(row, index),
            column.input.value,
            column.numeric,
          ),
      );
    }
    rows.sort((a, b) => {
      const difference =
        sortColumn < 0
          ? 0
          : direction *
            compareValues(
              cellValue(a, sortColumn),
              cellValue(b, sortColumn),
              columns[sortColumn].numeric,
            );
      return difference || originalOrder.get(a)! - originalOrder.get(b)!;
    });
    // Move only out-of-order rows, preserving focus in observation inputs.
    rows.forEach((row, index) => {
      if (body.rows[index] !== row)
        body.insertBefore(row, body.rows[index] ?? null);
    });
    columns.forEach((column, index) => {
      if (!column.button) return;
      header.cells[index].setAttribute(
        "aria-sort",
        index === sortColumn
          ? direction === 1
            ? "ascending"
            : "descending"
          : "none",
      );
      column.button.textContent =
        column.label +
        (index === sortColumn ? (direction === 1 ? " ↑" : " ↓") : " ↕");
    });
    const visible = rows.filter((row) => !row.hidden).length;
    count.textContent = `${visible} of ${rows.length} rows`;
    empty.hidden = visible > 0;
    empty.textContent = rows.length
      ? "No matching rows. Adjust filters or reset the table."
      : "Results will appear here after experiments run.";
    observer.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
  reset.onclick = () => {
    for (const column of columns) if (column.input) column.input.value = "";
    sortColumn = -1;
    apply();
  };
  body.addEventListener("input", () => apply());
  apply();
}
