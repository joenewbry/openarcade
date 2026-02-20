'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Load the game design guide once at startup
let DESIGN_GUIDE = '';
try {
  DESIGN_GUIDE = fs.readFileSync(
    path.join(__dirname, '..', 'game-design-guide.md'),
    'utf8'
  );
} catch (e) {
  console.warn('Warning: could not load game-design-guide.md:', e.message);
}

const CHAT_SYSTEM_PROMPT = `You are the OpenArcade Game Builder AI — a friendly, enthusiastic game design collaborator.

Your job is to have a natural conversation with the user to design a complete HTML5 game spec, then hand it off to code generation. You work through the game-design-guide.md checklist naturally, never in a robotic checklist fashion.

${DESIGN_GUIDE}

---

BEHAVIOR RULES:
1. Never mention the checklist to the user. Work through it organically in conversation.
2. Keep responses concise — 2-4 sentences per turn. Don't overwhelm.
3. Ask one question at a time. Don't barrage with multiple questions.
4. Show genuine enthusiasm for creative ideas.
5. When you have enough info for a section, move naturally to the next gap.
6. After sections 1-4 are done, generate a concept art prompt and say "I think we're ready to create some concept art — want to see what this could look like?"
7. After concept art is approved, say "Perfect — ready to generate your game? This will take about [N] seconds." where N is estimated from the tech stack.
8. When extracting design decisions, output a JSON block at the END of your response (hidden from user) in this format:
   <!-- DESIGN_UPDATE: {"section": "visual", "field": "background", "value": "#0a0a1a"} -->
   Use one per meaningful extracted decision.
9. For the concept art prompt, output at end:
   <!-- CONCEPT_ART_PROMPT: [full Grok prompt here] -->
10. When design is complete and user approves generation, output at end:
   <!-- READY_TO_GENERATE: true -->

Remember: you're building excitement and helping someone create their dream game. Be a great collaborator.`;

/**
 * Stream a chat response to the Express response object as SSE.
 * @param {Array} messages - array of {role, content} objects
 * @param {string} gameId - for logging
 * @param {object} res - Express response (SSE)
 */
async function streamChat(messages, gameId, res) {
  const stream = await client.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: CHAT_SYSTEM_PROMPT,
    messages,
  });

  let fullText = '';

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      const text = chunk.delta.text;
      fullText += text;
      // Strip hidden comments before streaming to client
      const visibleText = text.replace(/<!--[\s\S]*?-->/g, '');
      if (visibleText) {
        res.write(`data: ${JSON.stringify({ type: 'text', text: visibleText })}\n\n`);
      }
    }
  }

  // Extract hidden metadata from full response
  const metadata = extractMetadata(fullText);
  if (Object.keys(metadata).length > 0) {
    res.write(`data: ${JSON.stringify({ type: 'metadata', ...metadata })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  return { fullText, metadata };
}

/**
 * Single (non-streaming) call — used for classification and patch decisions.
 */
async function complete(systemPrompt, userPrompt, maxTokens = 512) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return msg.content[0]?.text || '';
}

/**
 * Stream code generation step to SSE.
 * @param {string} system - system prompt for this step
 * @param {string} userPrompt - the step-specific prompt
 * @param {object} res - Express response (SSE)
 * @param {string} stepName - for progress events
 * @param {number} pct - progress percentage
 * @returns {string} full generated text
 */
async function streamGenerationStep(system, userPrompt, res, stepName, pct) {
  res.write(`event: progress\ndata: ${JSON.stringify({ step: stepName, pct })}\n\n`);

  const stream = await client.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      fullText += chunk.delta.text;
    }
  }

  return fullText;
}

function extractMetadata(text) {
  const meta = {};

  // Extract design updates
  const designUpdates = [];
  const duRegex = /<!--\s*DESIGN_UPDATE:\s*(\{[\s\S]*?\})\s*-->/g;
  let match;
  while ((match = duRegex.exec(text)) !== null) {
    try { designUpdates.push(JSON.parse(match[1])); } catch {}
  }
  if (designUpdates.length) meta.designUpdates = designUpdates;

  // Extract concept art prompt
  const capMatch = /<!--\s*CONCEPT_ART_PROMPT:\s*([\s\S]*?)\s*-->/.exec(text);
  if (capMatch) meta.conceptArtPrompt = capMatch[1].trim();

  // Extract ready to generate flag
  if (/<!--\s*READY_TO_GENERATE:\s*true\s*-->/.test(text)) meta.readyToGenerate = true;

  return meta;
}

module.exports = { streamChat, complete, streamGenerationStep };
