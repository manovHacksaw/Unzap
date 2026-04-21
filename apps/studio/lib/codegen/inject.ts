import { TEMPLATES } from "./templateContents";

/**
 * Reads a template from the bundled TEMPLATES map.
 * All template files are embedded at build time by scripts/bundle-templates.mjs,
 * so no filesystem access is needed at runtime (safe for Vercel serverless).
 */
export function readTemplate(...paths: string[]): string {
  const key = paths.join("/");
  const content = TEMPLATES[key];
  if (content === undefined) {
    throw new Error(`Template not found: ${key}. Run scripts/bundle-templates.mjs to regenerate.`);
  }
  return content;
}

/**
 * Replaces {{KEY}} placeholders in the template with corresponding values.
 */
export function inject(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value);
  }
  return result;
}
