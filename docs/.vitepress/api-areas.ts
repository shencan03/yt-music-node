/** The API reference areas, in sidebar order. Each is a folder under docs/api/ with one page per method. */
export const API_AREAS = [
  { slug: "client", title: "Client" },
  { slug: "search", title: "Search" },
  { slug: "browsing", title: "Browsing" },
  { slug: "watch", title: "Watch playlists" },
  { slug: "explore", title: "Explore & charts" },
  { slug: "podcasts", title: "Podcasts" },
  { slug: "playlists", title: "Playlists" },
  { slug: "library", title: "Library & account" },
  { slug: "uploads", title: "Uploads" },
  { slug: "raw", title: "Raw requests" },
] as const;

export type AuthMode = "none" | "optional" | "required";

/** Frontmatter of a method page (docs/api/<area>/<method>.md). */
export interface MethodFrontmatter {
  title: string;
  /** a short phrase for tables and the sidebar tooltip */
  summary: string;
  /** absent for the client pages */
  auth?: AuthMode;
  /** changes the account */
  write?: boolean;
  /** ytmusicapi name, when it isn't the snake_case form of the title */
  upstream?: string;
  /** position within the area */
  order: number;
}
