const { formatDashScopeRequest, formatDashScopeResponse } = require('../../src/utils/formatter');

describe('formatDashScopeRequest', () => {
  it('should include model, messages from context, and new prompt', () => {
    const sessionId = 's123';
    const contextMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];
    const prompt = 'How are you?';

    const request = formatDashScopeRequest(sessionId, contextMessages, prompt);

    expect(request.model).toBe('qwen-turbo');
    expect(request.input.messages).toHaveLength(3);
    expect(request.input.messages[0]).toEqual(contextMessages[0]);
    expect(request.input.messages[1]).toEqual(contextMessages[1]);
    expect(request.input.messages[2]).toEqual({ role: 'user', content: prompt });
    expect(request.parameters).toBeDefined();
  });

  it('should handle empty contextMessages', () => {
    const sessionId = 's456';
    const contextMessages = [];
    const prompt = 'First message';

    const request = formatDashScopeRequest(sessionId, contextMessages, prompt);

    expect(request.model).toBe('qwen-turbo');
    expect(request.input.messages).toHaveLength(1);
    expect(request.input.messages[0]).toEqual({ role: 'user', content: prompt });
  });

  it('should handle null contextMessages', () => {
    const sessionId = 's789';
    const prompt = 'Another message';

    const request = formatDashScopeRequest(sessionId, null, prompt);
    expect(request.model).toBe('qwen-turbo');
    expect(request.input.messages).toHaveLength(1);
    expect(request.input.messages[0]).toEqual({ role: 'user', content: prompt });
  });
});

describe('formatDashScopeResponse', () => {
  it('should return string response directly if input is string', () => {
    const apiResponse = 'Simple AI response string';
    expect(formatDashScopeResponse(apiResponse)).toBe(apiResponse);
  });

  it('should extract content from complex object response', () => {
    const apiResponse = {
      output: {
        choices: [{ message: { content: 'Content from complex object' } }]
      }
    };
    expect(formatDashScopeResponse(apiResponse)).toBe('Content from complex object');
  });

  it('should return the input itself if structure is not recognized', () => {
    const unusualResponse = { data: 'Some unusual structure' };
    expect(formatDashScopeResponse(unusualResponse)).toBe(unusualResponse);

    const nullResponse = null;
    expect(formatDashScopeResponse(nullResponse)).toBeNull();
  });
});
