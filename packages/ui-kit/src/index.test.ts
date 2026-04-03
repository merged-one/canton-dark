import { describe, expect, it } from "vitest";

import {
  appChromeStyles,
  escapeHtml,
  joinList,
  renderAppShell,
  renderCard,
  renderKeyValueGrid,
  renderMetricGrid,
  renderNotice,
  renderPill,
  renderTable,
  renderWideCard,
  statusToneClass
} from "./index";

describe("ui-kit helpers", () => {
  it("escapes HTML and formats lists", () => {
    expect(escapeHtml(`<tag attr="value">`)).toBe("&lt;tag attr=&quot;value&quot;&gt;");
    expect(joinList([])).toBe("none");
    expect(joinList(["dealer-a", "dealer-b"])).toBe("dealer-a, dealer-b");
  });

  it("maps venue status to tone classes", () => {
    expect(statusToneClass("healthy")).toBe("tone-ok");
    expect(statusToneClass("paused")).toBe("tone-warn");
    expect(statusToneClass("rejected")).toBe("tone-alert");
  });

  it("renders shared shell, cards, notices, pills, and tables", () => {
    const markup = renderAppShell({
      title: "Demo",
      strapline: "Thin adapters only",
      sessionBadges: [renderPill("operator", "accent"), renderPill("ready", "ok")],
      content: `
        ${renderNotice("Pair loaded.", "ok")}
        ${renderCard({
          title: "Snapshot",
          subtitle: "Deterministic",
          body: renderTable({
            columns: [
              { key: "id", label: "ID" },
              { key: "status", label: "Status" }
            ],
            emptyMessage: "No rows.",
            rows: [
              {
                id: "row-1",
                cells: {
                  id: "pair-demo",
                  status: "open"
                }
              }
            ]
          })
        })}
      `
    });

    expect(markup).toContain("Thin adapters only");
    expect(markup).toContain("Pair loaded.");
    expect(markup).toContain("Snapshot");
    expect(markup).toContain("pair-demo");
    expect(markup).toContain("operator");
    expect(appChromeStyles).toContain("--accent");
  });

  it("renders wide cards, metric grids, key-value grids, and empty tables", () => {
    const wideCard = renderWideCard({
      title: "Detail",
      body: `
        ${renderMetricGrid([
          { label: "RFQs", value: "1" },
          { label: "Quotes", value: "2" }
        ])}
        ${renderKeyValueGrid([
          { key: "Pair", value: "pair-demo" },
          { key: "Dealer", value: "dealer-alpha" }
        ])}
      `,
      testId: "wide-card"
    });
    const emptyMetrics = renderMetricGrid([]);
    const emptyTable = renderTable({
      columns: [{ key: "status", label: "Status", numeric: true }],
      emptyMessage: "Nothing here.",
      rows: [],
      testId: "empty-table"
    });

    expect(wideCard).toContain('data-testid="wide-card"');
    expect(wideCard).toContain("pair-demo");
    expect(wideCard).toContain("Dealer");
    expect(emptyMetrics).toBe("");
    expect(emptyTable).toContain("Nothing here.");
    expect(emptyTable).toContain('data-testid="empty-table"');
  });

  it("covers optional caption, numeric, and data-testid branches", () => {
    const pill = renderPill("loaded", "warn", "pill-id");
    const notice = renderNotice("watch", "alert", "notice-id");
    const card = renderCard({
      title: "Compact",
      body: "body-only"
    });
    const testedCard = renderCard({
      title: "Tagged",
      body: "body",
      testId: "card-id"
    });
    const wideCardWithSubtitle = renderWideCard({
      title: "Wide",
      subtitle: "with subtitle",
      body: "body"
    });
    const populatedTable = renderTable({
      caption: "Rows",
      columns: [{ key: "count", label: "Count", numeric: true }],
      emptyMessage: "unused",
      rows: [
        {
          id: "row-1",
          cells: {
            count: "4"
          }
        }
      ],
      testId: "table-id"
    });

    expect(pill).toContain('data-testid="pill-id"');
    expect(notice).toContain('data-testid="notice-id"');
    expect(card).not.toContain("card-subtitle");
    expect(testedCard).toContain('data-testid="card-id"');
    expect(wideCardWithSubtitle).toContain("with subtitle");
    expect(populatedTable).toContain("<caption>Rows</caption>");
    expect(populatedTable).toContain('data-testid="table-id"');
    expect(populatedTable).toContain('class="numeric"');
  });

  it("covers empty-table and missing-cell branches", () => {
    const emptyTable = renderTable({
      columns: [{ key: "missing", label: "Missing" }],
      emptyMessage: "No entries.",
      rows: []
    });
    const sparseTable = renderTable({
      columns: [{ key: "missing", label: "Missing" }],
      emptyMessage: "unused",
      rows: [
        {
          id: "row-1",
          cells: {}
        }
      ]
    });

    expect(emptyTable).toContain("No entries.");
    expect(emptyTable).not.toContain("data-testid");
    expect(sparseTable).toContain('data-row-id="row-1"');
    expect(sparseTable).toContain('<td class=""></td>');
  });
});
