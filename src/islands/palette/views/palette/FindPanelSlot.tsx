/** @jsxImportSource preact */
// The desktop Find panel's place in the palette grid (pf hand-off; owner answer Q5, board DeskStates:
// at 960 px and wider Find stands beside the chart, the page usable around it). Sheets.tsx draws it
// (FindPanel: Find in a region frame, not a modal); find.css places it in the grid; Palette.tsx (pf-b)
// mounts this slot in the palette body. Under 960 px Find opens as its sheet.
import { FindPanel } from '../Sheets.tsx';

export function FindPanelSlot() {
  return <FindPanel />;
}
