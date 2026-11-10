/** Every method page's frontmatter, for the method tables and the old-anchor redirects. */
import { createContentLoader } from "vitepress";
import type { MethodFrontmatter } from "../api-areas";

export interface MethodPage extends MethodFrontmatter {
  area: string;
  /** site-relative, without the base: /api/browsing/getArtist */
  url: string;
}

declare const data: MethodPage[];
export { data };

export default createContentLoader("api/*/*.md", {
  transform(raw): MethodPage[] {
    return raw
      .filter((page) => !page.url.endsWith("/"))
      .map((page) => ({
        ...(page.frontmatter as MethodFrontmatter),
        area: page.url.split("/")[2]!,
        url: page.url,
      }))
      .sort((a, b) => a.area.localeCompare(b.area) || a.order - b.order);
  },
});
