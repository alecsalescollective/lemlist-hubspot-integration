const axios = require('axios');
const { createLogger } = require('../utils/logger');
const nurtureFields = require('../config/nurture-fields');

const logger = createLogger('anthropic-client');

/**
 * Analyze deal notes from a Closed Lost - Nurture opportunity and return
 * a nurture hypothesis + context summary for updating Salesforce Contacts.
 *
 * @param {Object} dealNotes - Key-value object of opportunity field values
 * @param {string} opportunityName - Name of the opportunity for context
 * @returns {{ hypothesis: string, contextSummary: string }}
 */
async function analyzeNurtureDeal(dealNotes, opportunityName) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Build the deal notes text from available fields
  const noteSections = [];
  const fieldLabels = {
    theGap: 'The GAP',
    ourAnalysis: 'Our Analysis',
    rootCauses: 'Root Causes',
    revenueProblems: 'Revenue Problems & Desired Outcomes',
    businessImpact: 'Business Impact',
    foundationalFacts: 'Foundational Facts & Context',
    winLossDetails: 'Win/Loss Details',
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    const value = dealNotes[key];
    if (value && String(value).trim()) {
      noteSections.push(`**${label}:**\n${String(value).trim()}`);
    }
  }

  // If no deal notes exist, return Unknown
  if (noteSections.length === 0) {
    logger.warn({ opportunityName }, 'No deal notes found, defaulting to Unknown');
    return {
      hypothesis: 'Unknown',
      contextSummary: 'No deal notes available for analysis.',
    };
  }

  const validValues = nurtureFields.hypothesisValues.join(', ');

  const systemPrompt = `You are a sales analyst for a B2B training and consulting company. Your job is to analyze closed-lost deal notes and determine the primary nurture hypothesis — the core problem area the prospect was trying to solve.

Select exactly ONE hypothesis from these categories:
- **Competency-based Training**: The prospect needed skills training, certification, or competency development for their team.
- **Hiring**: The prospect's primary problem was recruiting, talent acquisition, or workforce planning.
- **Process**: The prospect needed to fix operational processes, workflows, or systems.
- **Leadership**: The prospect needed leadership development, management coaching, or executive alignment.
- **Newsletter Only**: The prospect showed minimal buying intent — keep them on the newsletter for brand awareness only.
- **Unknown**: The deal notes are insufficient or ambiguous to determine a clear hypothesis.

Also write a concise context summary (2-4 sentences) that captures:
1. What the prospect's situation was
2. Why the deal was lost
3. What nurture angle would be most relevant for re-engagement

You MUST respond with ONLY valid JSON, no other text:
{
  "hypothesis": "one of: ${validValues}",
  "contextSummary": "your 2-4 sentence summary here"
}`;

  const userPrompt = `Analyze this closed-lost opportunity and determine the nurture hypothesis.

**Opportunity:** ${opportunityName}

${noteSections.join('\n\n')}`;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.content?.[0]?.text;
    if (!content) {
      throw new Error('Empty response from Anthropic');
    }

    const parsed = JSON.parse(content);

    // Validate hypothesis is a known value
    const hypothesis = nurtureFields.hypothesisValues.includes(parsed.hypothesis)
      ? parsed.hypothesis
      : 'Unknown';

    const contextSummary = parsed.contextSummary || 'AI analysis completed but no summary generated.';

    logger.info({ opportunityName, hypothesis }, 'AI nurture analysis completed');

    return { hypothesis, contextSummary };
  } catch (error) {
    logger.error({ error: error.response?.data || error.message, opportunityName }, 'Anthropic analysis failed');
    throw error;
  }
}

module.exports = { analyzeNurtureDeal };
