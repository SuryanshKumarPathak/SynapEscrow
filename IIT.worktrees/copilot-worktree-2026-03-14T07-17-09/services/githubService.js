const axios = require("axios");

const SUPPORTED_EXTENSIONS = [
  ".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx",
  ".py", ".java", ".rb", ".go", ".php", ".cs",
  ".html", ".css", ".scss", ".sass", ".less",
  ".json", ".yml", ".yaml", ".xml", ".md", ".txt",
  ".sql", ".sh", ".bat", ".ps1", ".ipynb"
];

const IGNORED_PATH_SEGMENTS = [
  "node_modules/", "dist/", "build/", ".next/", ".git/",
  "vendor/", "coverage/", "__pycache__/"
];

const MAX_FILES_TO_READ = 80;
const MAX_CHARS_PER_FILE = 1800;

const GITHUB_HEADERS = process.env.GITHUB_TOKEN
  ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
  : {};

async function getRepoFiles(repoLink) {

    const clean = repoLink.replace("https://github.com/", "").split("?")[0];
    const parts = clean.split("/");
    const owner = parts[0];
    const repo = parts[1]?.replace(".git", "");

    let response;
    let branch = "main";
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
      response = await axios.get(apiUrl, { headers: GITHUB_HEADERS });
    } catch {
      branch = "master";
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
      response = await axios.get(apiUrl, { headers: GITHUB_HEADERS });
    }

    const files = (response.data.tree || [])
      .filter((f) => f.type === "blob")
      .filter((f) => !IGNORED_PATH_SEGMENTS.some((segment) => f.path.includes(segment)))
      .filter((f) => SUPPORTED_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)))
      .slice(0, MAX_FILES_TO_READ);

    let structure = "";
    let code = "";

    for (let file of files) {

        structure += file.path + "\n";

        try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
            const fileContent = await axios.get(rawUrl, {
              headers: GITHUB_HEADERS,
              responseType: "text",
              transformResponse: [(v) => v]
            });
            let content = "";

            if (file.path.endsWith(".ipynb")) {
                try {
                    const nb = typeof fileContent.data === "string"
                        ? JSON.parse(fileContent.data)
                        : fileContent.data;
                    const cells = nb.cells || [];
                    content = cells
                        .filter((c) => c.cell_type === "code")
                        .map((c) => (Array.isArray(c.source) ? c.source.join("") : c.source))
                        .join("\n");
                } catch {
                    content = typeof fileContent.data === "string"
                      ? fileContent.data.substring(0, MAX_CHARS_PER_FILE)
                        : "";
                }
            } else {
                  content = typeof fileContent.data === "string"
                    ? fileContent.data
                    : JSON.stringify(fileContent.data);
            }

            code += `\nFILE: ${file.path}\n`;
                code += content.substring(0, MAX_CHARS_PER_FILE);

        } catch (err) {}

    }

    return { structure, code };

}

module.exports = { getRepoFiles };