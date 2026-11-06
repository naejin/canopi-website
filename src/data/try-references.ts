// The TRY dataset list on /data-sources/, read when the site builds. Both files are written by
// `npm run install:consortium` from canopi-data's consortium export, never by hand;
// try_references.meta.json holds the export's hash and counts: a row that does not parse, or
// another count, stops the build.
import source from './try_references.tsv?raw';
import meta from './try_references.meta.json';
import { parseTryReferences } from '../lib/try-references';

export const tryReferences = parseTryReferences(source, meta);
export const tryDatasetCount = meta.dataset_ids;
