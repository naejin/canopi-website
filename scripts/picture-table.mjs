// The cell-equivalence check every picture's unit test calls (plant-palette-architecture 3.4, P17):
// the table form (rules/picture.ts tableOf, the pictures' screen-reader form) holds the same rows,
// columns and cells as the picture, with every plant listed, and a hole in the same cells. Not a
// test file: import { sameCells } from './picture-table.mjs' and pass the picture and its table.
import assert from 'node:assert/strict';

export function sameCells(picture, table, label = picture.title) {
  assert.equal(table.title, picture.title, `${label}: title`);
  assert.deepEqual(table.columns, picture.columns, `${label}: columns`);
  assert.equal(table.rows.length, picture.rows.length, `${label}: every row, none dropped`);
  picture.rows.forEach((row, r) => {
    const t = table.rows[r];
    assert.deepEqual([t.key, t.head, t.state], [row.key, row.head, row.state], `${label}: row ${row.key}`);
    assert.equal(t.cells.length, row.cells.length, `${label}: row ${row.key} cells`);
    row.cells.forEach((cell, c) => {
      assert.deepEqual([...t.cells[c].ids].sort(), [...cell.ids, ...cell.hidden].sort(), `${label}: ${row.key} column ${c}: the same plants`);
      assert.equal(t.cells[c].hole, cell.hole, `${label}: ${row.key} column ${c}: the same hole`);
      assert.equal(t.cells[c].names.length, t.cells[c].ids.length, `${label}: ${row.key} column ${c}: a full name for each plant`);
    });
  });
}
