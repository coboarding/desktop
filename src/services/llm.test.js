// Set NODE_ENV to 'test' to prevent actual module loading
process.env.NODE_ENV = 'test';

// Mock fs to avoid file system dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockImplementation((path, options) => {
    if (options && (options.start === 0 && options.end === 4)) {
      // Mock the magic bytes check
      return Buffer.from([0, 0, 0, 1]);
    }
    return '{"model_type":"test_model"}';
  })
}));

// Mock electron-log
jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const LLMService = require('./llm');
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
    // Check that the process method exists (not processText)
    expect(typeof llm.process).toBe('function');
    const answer = await llm.process('Cześć');
    expect(answer.toLowerCase()).toContain('witaj');
  });
});
