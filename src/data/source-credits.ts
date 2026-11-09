// The source credits on /data-sources/, read when the site builds. source_credits.tsv is written by
// `npm run install:consortium` from canopi-data's consortium export when its manifest lists
// `source_credits`, never by hand. Until an export ships it there is no file and the page shows the
// TRY list alone: the glob finds nothing and this is null. A row that does not parse stops the build.
import { parseSourceCredits, shownCredits } from '../lib/source-credits';

const files = import.meta.glob('./source_credits.tsv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const source = files['./source_credits.tsv'];

export const sourceCredits = source === undefined ? null : shownCredits(parseSourceCredits(source));
