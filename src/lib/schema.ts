import { z } from 'zod';

const imageSchema = z.object({
  label: z.string().optional(),
  path: z.string(),
  face: z.boolean().optional(),
});

const linkSchema = z.union([
  z.string(),
  z.object({
    label: z.string().optional(),
    url: z.string().optional(),
    href: z.string().optional(),
    date: z.string().optional(),
    when: z.string().optional(),
    name: z.string().optional(),
  }),
]);

export const projectSchema = z.object({
  title: z.string(),
  live: z.boolean().optional(),
  from: z.string().optional(),
  date: z.string().optional(),
  'start-date': z.string().optional(),
  'end-date': z.string().optional(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
  images: z.array(imageSchema).optional(),
  link: z.union([linkSchema, z.array(linkSchema)]).optional(),
  impactful: z.boolean().optional(),
  notable: z.boolean().optional(),
});

export const timelineItemSchema = z.object({
  name: z.string(),
  from: z.string().optional(),
  description: z.string().optional(),
  badges: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(imageSchema).optional(),
  link: z.union([linkSchema, z.array(linkSchema)]).optional(),
  impactful: z.boolean().optional(),
  notable: z.boolean().optional(),
});

export const timelineGroupSchema = z.object({
  when: z.string(),
  summary: z.string().optional(),
  items: z.array(timelineItemSchema),
});

export const portfolioSchema = z.object({
  coverflowImages: z.array(imageSchema).optional(),
  projects: z.array(projectSchema),
  hackathons: z.array(timelineGroupSchema),
  awards: z.array(timelineGroupSchema),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type Project = z.infer<typeof projectSchema>;
export type TimelineGroup = z.infer<typeof timelineGroupSchema>;
