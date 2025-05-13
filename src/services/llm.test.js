const LLMService = require('./llm');
const fs = require('fs');
const path = require('path');

describe('LLMService', () => {
  const modelPath = path.join(__dirname, '../../models/llm/model.onnx');
  let llm;

  beforeAll(() => {
    llm = new LLMService({ modelPath });
  });

  test('should initialize without throwing', async () => {
    await expect(llm.initialize()).resolves.toBe(true);
  });

  test('should answer simple greeting', async () => {
    await llm.initialize();
    expect(typeof llm.processText).toBe('function');
    const answer = await llm.processText('Cześć');
    expect(answer.toLowerCase()).toContain('witaj');
  });
});
