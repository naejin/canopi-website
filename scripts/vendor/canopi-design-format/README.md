# Canopi design format (vendored)

`canopi-design-format.ts` is the Canopi app's generated design-file format
(`desktop/web/src/generated/canopi-design-format.ts`, written by `cargo run -p bindings-gen`) at app
commit `0c425fb07`, copied unchanged below a header naming its source and licence: GNU AGPL v3 or
later, Copyright (C) 2026 Canopi contributors.

It is test-only and never shipped. The consortium tool's `.canopi` download (design check A11, stream
S4) is checked against `CANOPI_FILE_SCHEMA` with `validate.mjs`, a small JSON Schema reader limited
to the keywords the schema uses (`type`, `required`, `properties`, `additionalProperties`, `items`,
`$ref`, `const`, `enum`, `oneOf`, `anyOf`, `minimum`, `maximum`, integer formats).

To update: copy the file from a newer app commit with the same header and change the commit here.
