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

export interface Book {
  by: string;
  year: string;
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
    book = { by: '', year: '', editions: [] };
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
  if (!field || !book) return fail(line, 'expected "- by:", "- year:" or "- <language>: [Title](https://…)" under a "### Book"');
  const [, name, value] = field;
  if (name === 'by') book.by = value;
  else if (name === 'year') book.year = value;
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
