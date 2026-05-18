import portfolioJson from '../data/portfolio.json';
import colorsJson from '../data/colors.json';
import seoJson from '../data/seo.json';
import { portfolioSchema } from './schema';

export const portfolio = portfolioSchema.parse(portfolioJson);
export const coverflowColors = colorsJson as Record<string, string>;
export const seo = seoJson as {
  siteUrl: string;
  siteName: string;
  title: string;
  description: string;
  person: {
    name: string;
    jobTitle: string;
    description: string;
    image: string;
    sameAs: string[];
  };
  sitemap?: { urls: { loc: string; priority?: string; changefreq?: string }[] };
};
