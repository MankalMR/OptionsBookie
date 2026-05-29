import { AI_PROMPTS } from './prompts';

describe('AI_PROMPTS', () => {
  it('should generate ETF_RECOVERY prompt with ticker', () => {
    const prompt = AI_PROMPTS.ETF_RECOVERY('TSLA');
    expect(prompt).toContain('TSLA');
    expect(prompt).toContain('fundName');
  });

  it('should generate PORTFOLIO_SUMMARY prompt with all metrics', () => {
    const metrics = { totalPnL: 100, winRate: 50, topSymbols: ['ABC'], totalRoC: 5 };
    const prompt = AI_PROMPTS.PORTFOLIO_SUMMARY('Monthly', metrics);
    expect(prompt).toContain('Monthly');
    expect(prompt).toContain('$100');
    expect(prompt).toContain('50%');
    expect(prompt).toContain('ABC');
  });

  it('should generate QUERY_PARSER prompt with input query', () => {
    const prompt = AI_PROMPTS.QUERY_PARSER('find my calls');
    expect(prompt).toContain('find my calls');
  });
});
