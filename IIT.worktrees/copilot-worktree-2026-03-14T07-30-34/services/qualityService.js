const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeCode(milestone, repoStructure, repoCode) {

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

const prompt = `
You are a senior software QA reviewer. Evaluate the implementation progress of a milestone using repository structure and code snippets.

Milestone Requirement:
${milestone}

Repository File Structure:
${repoStructure || "(empty)"}

Repository Code Snippets:
${repoCode || "(empty)"}

Scoring rubric (0-100):
- 0-20: setup/scaffold only, no milestone-specific logic
- 21-50: partial implementation, key pieces missing
- 51-80: mostly implemented, but important gaps/bugs remain
- 81-99: almost complete, only minor issues missing
- 100: fully complete and milestone requirements clearly satisfied

Rules:
- Use both filenames and code evidence.
- If some relevant implementation exists, do NOT return 0.
- Use 0 only when there is genuinely no milestone-related implementation.
- Use 100 only when requirement is fully satisfied.
- Keep explanation concise and evidence-based.

Return strict JSON only (no markdown, no code fences):
{
    "status": "Completed | Partially Completed | Not Completed",
    "completion_percentage": 0,
    "short_explanation": "brief reason with evidence"
}
`;

const result = await model.generateContent(prompt);

const response = await result.response;

return response.text();

}

module.exports = { analyzeCode };