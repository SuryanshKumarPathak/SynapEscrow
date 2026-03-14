const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateMilestones(description) {

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const prompt = `
You are a senior technical project manager responsible for planning software development projects.

IMPORTANT: Return ONLY valid JSON, no other text before or after.

Break the following project into structured and realistic development milestones.

Return a JSON object with this exact structure:
{
  "projectTitle": "Concise professional title (3-7 words)",
  "milestones": [
    {
      "title": "Milestone Name",
      "description": "Clear description of what will be done",
      "expectedDeliverable": "What will be delivered",
      "estimatedTimeRange": "X-Y days",
      "workloadComplexity": "Low|Medium|High",
      "payoutPercentage": 15
    }
  ]
}

Rules:
1. Break project into 3-6 logical milestones (not too many, not too few)
2. Each milestone must have payoutPercentage (all must sum to exactly 100)
3. Higher complexity = higher payout percentage
4. estimatedTimeRange MUST be in format like "2-3 days", "1-2 weeks"
5. Return ONLY the JSON object, no markdown code blocks or extra text
6. Ensure all fields are strings except payoutPercentage which is a number

Project:
${description}`;

   const result = await model.generateContent(prompt);

  const response = await result.response;
  const text = response.text().trim();
  
  // Try to extract JSON from the response
  try {
    // Remove markdown code blocks if present
    let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const parsed = JSON.parse(jsonText);
    
    // Validate structure
    if (!parsed.projectTitle || !Array.isArray(parsed.milestones) || parsed.milestones.length === 0) {
      throw new Error('Invalid milestone structure');
    }
    
    // Ensure payoutPercentage is numeric
    parsed.milestones = parsed.milestones.map(m => ({
      ...m,
      payoutPercentage: Number(m.payoutPercentage) || 0
    }));
    
    // Verify payout percentages add to 100
    const totalPayout = parsed.milestones.reduce((sum, m) => sum + (Number(m.payoutPercentage) || 0), 0);
    if (totalPayout !== 100) {
      console.warn(`⚠️ Payout percentages sum to ${totalPayout}%, they should sum to 100%. Adjusting...`);
      // Normalize payouts if they don't sum to 100
      parsed.milestones = parsed.milestones.map((m, idx, arr) => ({
        ...m,
        payoutPercentage: idx === arr.length - 1 
          ? 100 - arr.slice(0, -1).reduce((sum, x) => sum + (Number(x.payoutPercentage) || 0), 0)
          : Number(m.payoutPercentage) || Math.round(100 / arr.length)
      }));
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error.message);
    console.error('Raw response:', text);
    
    // Fallback: return error structure
    return {
      projectTitle: 'Project Development',
      milestones: [{
        title: 'Project Completion',
        description: description.substring(0, 200),
        expectedDeliverable: 'Completed project deliverables',
        estimatedTimeRange: '1-4 weeks',
        workloadComplexity: 'Medium',
        payoutPercentage: 100
      }],
      error: 'Could not parse AI response, using fallback milestone'
    };
  }
}

module.exports = { generateMilestones };