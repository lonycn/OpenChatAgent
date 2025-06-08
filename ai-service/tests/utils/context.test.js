const { manageContext } = require('../../src/utils/context');

describe('manageContext', () => {
  const userMsg = (i) => ({ role: 'user', content: `User message ${i}` });
  const aiMsg = (i) => ({ role: 'assistant', content: `AI response ${i}` });

  it('should initialize context with new user and AI messages if currentContext is null or empty', () => {
    const newUser = userMsg(1);
    const newAi = aiMsg(1);
    const updatedContext = manageContext(null, newUser, newAi, 5);
    expect(updatedContext).toEqual([newUser, newAi]);

    const updatedContext2 = manageContext([], newUser, newAi, 5);
    expect(updatedContext2).toEqual([newUser, newAi]);
  });

  it('should append user and AI messages to existing context if below max size', () => {
    const current = [userMsg(1), aiMsg(1)];
    const newUser = userMsg(2);
    const newAi = aiMsg(2);
    const updatedContext = manageContext(current, newUser, newAi, 5);
    expect(updatedContext).toEqual([...current, newUser, newAi]);
    expect(updatedContext.length).toBe(4);
  });

  it('should only append AI message if user message is null', () => {
    const current = [userMsg(1)];
    const newAi = aiMsg(1);
    const updatedContext = manageContext(current, null, newAi, 5);
    expect(updatedContext).toEqual([...current, newAi]);
  });

  it('should only append user message if AI message is null', () => {
    const current = [aiMsg(1)];
    const newUser = userMsg(1);
    const updatedContext = manageContext(current, newUser, null, 5);
    expect(updatedContext).toEqual([...current, newUser]);
  });

  it('should not change context if both new messages are null', () => {
    const current = [userMsg(1), aiMsg(1)];
    const updatedContext = manageContext(current, null, null, 5);
    expect(updatedContext).toEqual(current);
  });

  it('should trim context to maxMessages if adding messages exceeds it', () => {
    const max = 4;
    const current = [userMsg(1), aiMsg(1), userMsg(2)]; // length 3
    const newUser = userMsg(3); // This would make it 4
    const newAi = aiMsg(3);   // This would make it 5

    const updatedContext = manageContext(current, newUser, newAi, max);
    expect(updatedContext.length).toBe(max);
    expect(updatedContext).toEqual([
      aiMsg(1), // Oldest userMsg(1) is removed
      userMsg(2),
      newUser, // userMsg(3)
      newAi    // aiMsg(3)
    ]);
  });

  it('should handle adding to a full context correctly', () => {
    const max = 2;
    const current = [userMsg(1), aiMsg(1)]; // length 2, full
    const newUser = userMsg(2);
    const newAi = aiMsg(2);
    // Adding two messages to a full context of 2, with max 2
    // Result should be [newUser, newAi]
    const updatedContext = manageContext(current, newUser, newAi, max);
    expect(updatedContext.length).toBe(max);
    expect(updatedContext).toEqual([newUser, newAi]);
  });

  it('should return an empty array if maxMessages is 0', () => {
    const current = [userMsg(1), aiMsg(1)];
    const newUser = userMsg(2);
    const newAi = aiMsg(2);
    const updatedContext = manageContext(current, newUser, newAi, 0);
    expect(updatedContext).toEqual([]);
  });

  it('should return an empty array if maxMessages is negative', () => {
    const current = [userMsg(1), aiMsg(1)];
    const newUser = userMsg(2);
    const newAi = aiMsg(2);
    const updatedContext = manageContext(current, newUser, newAi, -1);
    expect(updatedContext).toEqual([]);
  });

  it('should correctly trim if only one type of message is added and context exceeds max', () => {
    const max = 2;
    const current = [userMsg(1), aiMsg(1)];
    const newUser = userMsg(2); // Context becomes [u1, a1, u2] (len 3)
    const updatedContext = manageContext(current, newUser, null, max);
    expect(updatedContext.length).toBe(max);
    expect(updatedContext).toEqual([aiMsg(1), newUser]);
  });
});
