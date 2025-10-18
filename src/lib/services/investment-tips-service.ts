export interface FundingOpportunity {
  title: string;
  category: string;
  amount: string;
}

export interface InvestmentTips {
  date: string;
  sme: string;
  investor: string;
}

function fallbackTips(date: string): InvestmentTips {
  return {
    date,
    sme: 'Review current funding opportunities and align your application with the most relevant ones.',
    investor: 'Assess sector trends within today\u2019s opportunities to balance your portfolio.',
  };
}

/**
 * Generate daily investment tips using OpenAI. Results are cached in localStorage by date.
 * Falls back to static tips if API key is missing or the request fails.
 */
export async function getDailyInvestmentTips(
  opportunities: FundingOpportunity[],
): Promise<InvestmentTips> {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `investmentTips:${today}`;

  try {
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached) as InvestmentTips;
      }
    }
  } catch {
    // ignore storage errors
  }

  const getApiKey = () => {
    if (typeof process !== 'undefined' && process.env.VITE_OPENAI_API_KEY) {
      return process.env.VITE_OPENAI_API_KEY;
    }
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return undefined;
    }
    try {
      return new Function('return typeof import.meta !== "undefined" ? import.meta.env.VITE_OPENAI_API_KEY : undefined')();
    } catch {
      return undefined;
    }
  };
  
  const apiKey = getApiKey() as string | undefined;

  let tips: InvestmentTips;

  if (apiKey) {
    try {
      const brief = opportunities
        .slice(0, 3)
        .map((o) => `${o.title} (${o.category}, ${o.amount})`)
        .join('\n');

      const prompt =
        `Given the following funding opportunities:\n${brief}\n` +
        'Provide one actionable investment tip for SMEs and one for investors. ' +
        'Respond in JSON with keys "sme" and "investor".';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() ?? '';
      const parsed = JSON.parse(content);
      tips = { date: today, sme: parsed.sme, investor: parsed.investor };
    } catch (error) {
      console.error('AI tips generation failed', error);
      tips = fallbackTips(today);
    }
  } else {
    tips = fallbackTips(today);
  }

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(cacheKey, JSON.stringify(tips));
    }
  } catch {
    // ignore storage errors
  }

  return tips;
}
