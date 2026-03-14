const { getRepoFiles } = require("../services/githubService");
const { analyzeCode } = require("../services/qualityService");

async function verifyMilestone(req, res) {

  try {

    const { repoLink, milestone } = req.body;

    if (!repoLink || !milestone) {
      return res.status(400).json({
        error: "repoLink and milestone required"
      });
    }

    const { structure, code } = await getRepoFiles(repoLink);

    const result = await analyzeCode(milestone, structure, code);

    res.json({
      success: true,
      result
    });

  } catch (error) {

    console.error("QUALITY CHECK ERROR:", error?.response?.data || error?.message || error);

    res.status(500).json({
      error: "Quality check failed",
      detail: error?.response?.data?.message || error?.message || "Unknown error"
    });

  }

}

module.exports = { verifyMilestone };