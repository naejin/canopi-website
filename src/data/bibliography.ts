// The bibliography as src/data/bibliography.md writes it; the build reads that file, so editing it updates the site.
import source from './bibliography.md?raw';

export interface Edition {
  lang: string;
  title: string;
  url: string;
  // The author's name as that edition prints it (福岡正信), and the year of the text it translates,
  // when they differ from the book's.
  by?: string;
  year?: string;
}

// The Canopi app's climate zones, so a book here and a design in the app name a climate alike.
export const climates = ['tropical', 'subtropical', 'mediterranean', 'arid', 'temperate', 'continental', 'boreal'];

export interface Book {
  // A stable name other pages cite the book by (a Field Guide's sources), and its #anchor on /bibliography/.
  id?: string;
  by: string;
  year: string;
  // The climates the book is written for; empty when its advice holds in any climate.
  climates: string[];
  // Whether the home page shows it among the few books that open the bibliography.
  featured: boolean;
  // The original edition comes first.
  editions: Edition[];
}

export interface Theme {
  key: string;
  label: string;
  books: Book[];
}

const fail = (line: number, message: string): never => {
  throw new Error(`src/data/bibliography.md:${line}: ${message}`);
};

export const themes: Theme[] = [];
let book: Book | undefined;
let inComment = false;

source.split('\n').forEach((text, index) => {
  const line = index + 1;
  const trimmed = text.trim();
  // <!-- comments --> are notes for editors, however many lines they span.
  if (inComment || trimmed.startsWith('<!--')) {
    inComment = !trimmed.includes('-->');
    return;
  }
  if (!/^(##|-)/.test(trimmed)) return;

  if (trimmed.startsWith('### ')) {
    if (!themes.length) fail(line, 'a book comes before any "## Theme" heading');
    book = { by: '', year: '', climates: [], featured: false, editions: [] };
    themes.at(-1)!.books.push(book);
    return;
  }
  if (trimmed.startsWith('## ')) {
    const label = trimmed.slice(3).trim();
    const key = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    themes.push({ key, label, books: [] });
    book = undefined;
    return;
  }

  const field = trimmed.match(/^-\s*([a-zA-Z-]+)\s*:\s*(.*)$/);
  if (!field || !book) return fail(line, 'expected "- id:", "- by:", "- year:", "- climate:", "- featured:" or "- <language>: [Title](https://…)" under a "### Book"');
  const [, name, value] = field;
  // "- id:" names the book, not an Indonesian edition (write one of those as "- ind:").
  if (name === 'id') {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) fail(line, '"- id:" takes a kebab-case name, such as "landrace-gardening"');
    if (book.id) fail(line, 'a book has one "- id:"');
    if (themes.some((theme) => theme.books.some((other) => other.id === value))) fail(line, `the id "${value}" is already used by another book`);
    book.id = value;
  }
  else if (name === 'by') book.by = value;
  else if (name === 'year') book.year = value;
  else if (name === 'featured') {
    if (!/^(yes|no)$/i.test(value)) fail(line, '"- featured:" takes "yes" or "no"');
    book.featured = /^yes$/i.test(value);
  }
  else if (name === 'climate') {
    book.climates = value.split(',').map((climate) => climate.trim().toLowerCase());
    const unknown = book.climates.find((climate) => !climates.includes(climate));
    if (unknown !== undefined) fail(line, `"${unknown}" is not a climate; use ${climates.join(', ')}`);
  }
  else {
    const edition = value.match(/^\[(.+)\]\((https?:\/\/[^)\s]+)\)\s*(?:—\s*(.+))?$/);
    if (!edition) return fail(line, `the ${name} edition should read "[Title](https://…)", optionally followed by "— Author · Year"`);
    const notes = edition[3]?.split('·').map((note) => note.trim()) ?? [];
    book.editions.push({
      lang: name.toLowerCase(),
      // Typed plainly here, set as the site's copy is: curly apostrophes, and French ? ! ; held to their word.
      title: edition[1].replace(/'/g, '’').replace(/ ([?!;])/g, '\u202f$1'),
      url: edition[2],
      by: notes.find((note) => !/^\d{4}$/.test(note)),
      year: notes.find((note) => /^\d{4}$/.test(note)),
    });
  }
});

for (const theme of themes) {
  if (!theme.books.length) throw new Error(`src/data/bibliography.md: the theme "${theme.label}" has no books`);
  for (const { by, year, editions } of theme.books) {
    const name = editions[0]?.title ?? `a book in "${theme.label}"`;
    if (!by || !year || !editions.length) throw new Error(`src/data/bibliography.md: "${name}" needs "- by:", "- year:" and at least one edition`);
  }
}

// The home page opens the bibliography on a handful of books, whatever the size of the list.
const featured = themes.flatMap((theme) => theme.books).filter((book) => book.featured).length;
if (featured < 3 || featured > 6) throw new Error(`src/data/bibliography.md: mark 3 to 6 books "- featured: yes" for the home page (${featured} now)`);

// The edition a page in `lang` shows for a book: its own language when there is one, else the
// original. A Field Guide's "Go deeper" block and its JSON-LD citation both use it.
export const editionFor = (book: Book, lang: string): Edition => book.editions.find((e) => e.lang === lang) ?? book.editions[0];
