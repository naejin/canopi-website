// The TRY dataset list on /data-sources/, read when the site builds. try_references.tsv is copied
// from canopi-data data/curated/ and try_references.meta.json holds that source's counts: a row
// that does not parse, or another count, stops the build.
import source from './try_references.tsv?raw';
import meta from './try_references.meta.json';
import { parseTryReferences } from '../lib/try-references';

export const tryReferences = parseTryReferences(source, meta);
export const tryDatasetCount = meta.dataset_ids;
