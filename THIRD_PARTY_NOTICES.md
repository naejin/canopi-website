# Third-party notices

The projectcanopi.com website ships or uses the following third-party software. Versions are the
ones pinned in `package.json` / `package-lock.json`.

## Shipped to the browser (the consortium tool, `/consortium/`)

| Component | Version | Licence | Use |
|---|---|---|---|
| [SQLite](https://sqlite.org/) | 3.54.1 | Public domain ([sqlite.org/copyright.html](https://sqlite.org/copyright.html)) | Reads the consortium data export (a SQLite database) in the browser |
| [@sqlite.org/sqlite-wasm](https://github.com/sqlite/sqlite-wasm) | 3.54.1-build1 | Apache License 2.0 (the npm packaging; SQLite itself is public domain) | The WebAssembly build of SQLite and its loader |
| [Preact](https://preactjs.com/) | 11.0.1 | MIT, Copyright (c) 2015-present Jason Miller | The consortium tool's interface |
| [@preact/signals](https://github.com/preactjs/signals) and @preact/signals-core | 2.11.3 / 1.14.5 | MIT, Copyright (c) 2022-present Preact Team | The consortium tool's state |

The consortium data itself (the SQLite export under `/data/consortium/`) carries its own sources and
licences, credited on the Data sources page (`/data-sources/`).

## Test-only, never shipped

| Component | Licence | Use |
|---|---|---|
| `scripts/vendor/canopi-design-format/canopi-design-format.ts`, from the Canopi app (commit `0c425fb07`) | GNU AGPL v3 or later, Copyright (C) 2026 Canopi contributors | The `.canopi` file schema the "Download for Canopi" file is validated against in tests (see the folder's README) |

## MIT licence text

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Apache License 2.0

The full text is at <https://www.apache.org/licenses/LICENSE-2.0>.
