import { escapeHtml } from '../scripts/utils/data.js';

const ACTOR_ID = 'apimaestro~linkedin-profile-posts';
const MAX_POSTS = 3;
const EXCERPT_LEN = 140;

export type LinkedInPost = {
  text?: string;
  url?: string;
  posted_at?: { relative?: string; date?: string };
  stats?: {
    total_reactions?: number;
    comments?: number;
    reposts?: number;
  };
  media?: {
    type?: string;
    url?: string;
    images?: { url?: string }[];
  };
  author?: {
    first_name?: string;
    last_name?: string;
    profile_picture?: string;
  };
};

export function formatPostDate(relative?: string) {
  if (!relative) return '';
  return relative.split('•')[0]?.trim() || relative;
}

export function pickMediaUrl(post: LinkedInPost) {
  if (post.media?.url) return post.media.url;
  const first = post.media?.images?.[0]?.url;
  return first || '';
}

export function mediaCount(post: LinkedInPost) {
  if (post.media?.images?.length) return post.media.images.length;
  return post.media?.url ? 1 : 0;
}

/** First sentence, or text before the first newline (whichever comes first). */
export function splitPostLead(text: string) {
  const raw = (text || '').trim();
  if (!raw) return { lead: '', rest: '' };

  const newlineIdx = raw.search(/\r?\n/);
  if (newlineIdx >= 0) {
    const lead = raw.slice(0, newlineIdx).replace(/\s+/g, ' ').trim();
    const rest = raw
      .slice(newlineIdx + 1)
      .replace(/\s+/g, ' ')
      .trim();
    return { lead, rest };
  }

  const normalized = raw.replace(/\s+/g, ' ');
  const sentenceMatch = normalized.match(/^(.+?[.!?])(?:\s+|$)/);
  if (sentenceMatch) {
    const lead = sentenceMatch[1].trim();
    const rest = normalized.slice(sentenceMatch[0].length).trim();
    return { lead, rest };
  }

  return { lead: normalized, rest: '' };
}

export function renderPostTextHtml(text: string) {
  const { lead, rest } = splitPostLead(text);
  if (!lead && !rest) return '';

  const leadHtml = lead
    ? `<span class="linkedin-post-lead">${escapeHtml(lead)}</span>`
    : '';
  const restHtml = rest
    ? `<span class="linkedin-post-rest">${escapeHtml(rest)}</span>`
    : '';

  return `${leadHtml}${restHtml}`;
}

export function truncatePostText(text: string, max = EXCERPT_LEN) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  const slice = normalized.slice(0, max);
  const punct = slice.match(/[.!?](?=[^.!?]*$)/);
  if (punct && punct.index !== undefined && punct.index > 40) {
    return `${slice.slice(0, punct.index + 1).trim()}…`;
  }
  return `${slice.trim()}…`;
}

export type PostStatIcon = 'linkedinReaction' | 'linkedinComment' | 'linkedinRepost';

export type PostStatItem = {
  icon: PostStatIcon;
  count: number;
};

export function getPostStats(stats?: LinkedInPost['stats']): PostStatItem[] {
  if (!stats) return [];
  const items: PostStatItem[] = [];
  if (stats.total_reactions) {
    items.push({ icon: 'linkedinReaction', count: stats.total_reactions });
  }
  if (stats.comments) {
    items.push({ icon: 'linkedinComment', count: stats.comments });
  }
  if (stats.reposts) {
    items.push({ icon: 'linkedinRepost', count: stats.reposts });
  }
  return items;
}

export async function fetchLinkedInPosts(
  token: string | undefined
): Promise<LinkedInPost[]> {
  if (!token) {
    console.warn('[linkedin] APIFY_TOKEN not set; skipping feed fetch.');
    return [];
  }

  const url =
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/last/dataset/items` +
    `?token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Apify HTTP ${response.status}`);
    }
    const data = (await response.json()) as LinkedInPost[];
    if (!Array.isArray(data)) return [];
    return data.filter((p) => p?.url).slice(0, MAX_POSTS);
  } catch (error) {
    console.error('[linkedin] Feed build error:', error);
    return [];
  }
}
