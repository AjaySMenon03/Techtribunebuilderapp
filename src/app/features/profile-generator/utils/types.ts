/**
 * Profile Generator – type definitions
 */

export interface Profile {
  id: string;
  name: string;
  templateId: string;
  templateLabel: string;
  category: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

/**
 * Categories used to group and filter profiles.
 * Matches TEMPLATE_CATEGORIES from pg-types.ts for consistency.
 */
export const PROFILE_CATEGORIES = [
  'All Categories',
  'Engineer Spotlight',
  'Leadership Bio',
  'Team Member',
  'New Hire Welcome',
  'Creative Portfolio',
  'Minimal',
  'Custom',
] as const;

export type ProfileCategory = (typeof PROFILE_CATEGORIES)[number];

export function getCategoryLabel(category: string): string {
  return category || 'Custom';
}
