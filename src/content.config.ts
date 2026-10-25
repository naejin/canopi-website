// Content collections. Field Guides: src/content/guides/<slug>/<lang>.mdx, lang en or fr; a guide is
// published when both files exist (knowledge/decisions/field-guides-architecture.md). The glob stays
// inside src/content/guides/, so src/data/bibliography.md (read ?raw) is not a collection entry.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { guideDomains } from './i18n/guides';

const guides = defineCollection({
  loader: glob({ pattern: '*/{en,fr}.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(1),
    // One sentence: what the reader can do after reading. Also the page's meta description.
    description: z.string().min(1).max(200),
    domain: z.enum(guideDomains),
    order: z.number().int(),
    glance: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).min(3).max(6),
    quick: z.boolean().optional(),
    // Book ids from src/data/bibliography.md ("- id:"), with the chapter titles the guide draws on.
    sources: z.array(z.object({ book: z.string().min(1), chapters: z.array(z.string().min(1)).min(1) })).min(1),
    related: z.array(z.string()).default([]),
    updated: z.coerce.date(),
  }),
});

export const collections = { guides };
