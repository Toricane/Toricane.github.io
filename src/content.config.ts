import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
const imageSchema = z.object({
  label: z.string().optional(),
  path: z.string(),
  face: z.boolean().optional(),
});

const linkSchema = z.object({
  label: z.string().optional(),
  url: z.string().optional(),
  date: z.string().optional(),
});

const imageInput = z.union([z.string(), imageSchema]);
const linkInput = z.union([z.string(), linkSchema]);

const significanceSchema = z.enum(['gold', 'silver']).optional();

/** YAML may parse 2024-06-01 as a Date; Obsidian may write long date strings. */
const dateField = z.preprocess((val) => {
  if (val == null || val === '') return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (/GMT/.test(val) || /^\d{4}-\d{2}-\d{2}T/.test(val)) {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return val;
  }
  return String(val);
}, z.string().optional());

const hero = defineCollection({
  loader: glob({ base: './src/content/hero', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    from: z.string().optional(),
    startDate: dateField,
    endDate: dateField,
    date: z.string().optional(),
    live: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    images: z.array(imageInput).optional(),
    links: z.array(linkInput).optional(),
    significance: significanceSchema,
    gold: z.boolean().optional(),
    silver: z.boolean().optional(),
  }),
});

const timelineEntry = z.object({
  when: z.string(),
  groupSummary: z.string().optional(),
  name: z.string(),
  from: z.string().optional(),
  badges: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(imageInput).optional(),
  links: z.array(linkInput).optional(),
  significance: significanceSchema,
  gold: z.boolean().optional(),
  silver: z.boolean().optional(),
});

const hackathons = defineCollection({
  loader: glob({ base: './src/content/hackathons', pattern: '**/*.{md,mdx}' }),
  schema: timelineEntry,
});

const awards = defineCollection({
  loader: glob({ base: './src/content/awards', pattern: '**/*.{md,mdx}' }),
  schema: timelineEntry,
});

const coverflow = defineCollection({
  loader: glob({ base: './src/content/coverflow', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    label: z.string().optional(),
    image: z.string(),
    face: z.boolean().optional(),
  }),
});

export const collections = { hero, projects, hackathons, awards, coverflow };
