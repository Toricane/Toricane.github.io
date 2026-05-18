import colorsJson from '../data/colors.json';
import seoJson from '../data/seo.json';
import { buildPortfolio } from './buildPortfolio';

export { buildPortfolio };

export const portfolio = await buildPortfolio();

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
