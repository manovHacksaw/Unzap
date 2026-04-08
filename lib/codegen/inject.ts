import fs from "fs";
import path from "path";

/**
 * Reads a template file from the templates directory in the project root.
 */
export function readTemplate(...paths: string[]): string {
  const fullPath = path.join(process.cwd(), "templates", ...paths);
  try {
    return fs.readFileSync(fullPath, "utf8");
  } catch (error) {
    console.error(`[codegen/inject] Failed to read template at ${fullPath}`);
    throw error;
  }
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
