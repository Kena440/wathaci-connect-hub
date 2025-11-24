const buildLLMPrompt = ({ input, scores, swot, recommendations, bottlenecks }) => {
  const basePrompt = `You are an experienced African SME consultant designing a concise diagnostic.
Structured SME input: ${JSON.stringify(input)}
Pre-computed scores (0-100): ${JSON.stringify(scores)}
Rule-based SWOT: ${JSON.stringify(swot)}
Rule-based recommendations: ${JSON.stringify(recommendations)}
Rule-based bottlenecks: ${JSON.stringify(bottlenecks)}
Output strict JSON with keys: swot_analysis, bottlenecks, recommendations, suggested_opportunities, recommended_partners, narrative (3 short paragraphs), and keep advice practical for SMEs in Sub-Saharan Africa. If data is missing, flag gaps explicitly.`;

  return basePrompt;
};

module.exports = {
  buildLLMPrompt,
};
