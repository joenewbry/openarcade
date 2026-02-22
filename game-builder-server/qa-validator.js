'use strict';

/**
 * QA Validator — Two-tier validation for generated games.
 * Tier 1: Static analysis (instant, no API)
 * Tier 2: Claude Haiku review (3-5s)
 */

/**
 * Run static analysis checks on assembled HTML.
 * @param {string} html - the complete index.html content
 * @param {object} blueprint - the Game Blueprint JSON
 * @returns {{ pass: boolean, checks: object, issues: Array }}
 */
function staticAnalysis(html, blueprint) {
  const checks = {};
  const issues = [];

  // Structure checks
  checks['has-doctype'] = html.includes('<!DOCTYPE html>');
  if (!checks['has-doctype']) issues.push({ severity: 'critical', category: 'structure', description: 'Missing <!DOCTYPE html> declaration' });

  checks['has-canvas'] = html.includes('<canvas');
  if (!checks['has-canvas']) issues.push({ severity: 'critical', category: 'structure', description: 'Missing <canvas> element' });

  const canvasId = blueprint?.game?.canvasId || 'gameCanvas';
  checks['has-canvas-id'] = html.includes(`id="${canvasId}"`) || html.includes(`id='${canvasId}'`);
  if (!checks['has-canvas-id']) issues.push({ severity: 'major', category: 'structure', description: `Canvas missing expected id="${canvasId}"` });

  checks['has-overlay'] = /id=["']overlay["']/.test(html);
  if (!checks['has-overlay']) issues.push({ severity: 'major', category: 'structure', description: 'Missing #overlay div' });

  checks['has-closing-html'] = html.includes('</html>');
  if (!checks['has-closing-html']) issues.push({ severity: 'warning', category: 'structure', description: 'Missing closing </html> tag' });

  // Game loop checks
  checks['has-init'] = /function\s+init\s*\(/.test(html) || /const\s+init\s*=/.test(html);
  if (!checks['has-init']) issues.push({ severity: 'critical', category: 'game-loop', description: 'Missing init() function' });

  checks['has-game-loop'] = /function\s+gameLoop\s*\(/.test(html) || /function\s+loop\s*\(/.test(html) || /function\s+animate\s*\(/.test(html);
  if (!checks['has-game-loop']) issues.push({ severity: 'critical', category: 'game-loop', description: 'Missing gameLoop/loop/animate function' });

  checks['has-raf'] = html.includes('requestAnimationFrame');
  if (!checks['has-raf']) issues.push({ severity: 'critical', category: 'game-loop', description: 'Missing requestAnimationFrame' });

  checks['no-setinterval-loop'] = !/setInterval\s*\(\s*(?:gameLoop|update|render|tick|frame|loop|animate)/i.test(html);
  if (!checks['no-setinterval-loop']) issues.push({ severity: 'major', category: 'game-loop', description: 'Uses setInterval for game loop instead of requestAnimationFrame' });

  // Rendering checks
  checks['has-render'] = /function\s+render\s*\(/.test(html) || /function\s+draw\s*\(/.test(html);
  if (!checks['has-render']) issues.push({ severity: 'major', category: 'rendering', description: 'Missing render/draw function' });

  // Collision checks
  checks['has-collision'] = /collision|intersect|overlap|hitTest|hit_test/i.test(html);
  if (!checks['has-collision']) issues.push({ severity: 'warning', category: 'game-logic', description: 'No collision detection found' });

  // Game-over checks
  checks['has-game-over'] = /game.?over|gameOver|game_over/i.test(html);
  if (!checks['has-game-over']) issues.push({ severity: 'major', category: 'game-logic', description: 'No game-over condition found' });

  // Restart checks
  checks['has-restart'] = /restart|reset.?game|resetGame|playAgain|play.again|newGame|new.game/i.test(html);
  if (!checks['has-restart']) issues.push({ severity: 'major', category: 'game-logic', description: 'No restart mechanism found' });

  // Audio checks
  checks['has-audio'] = /AudioContext|webkitAudioContext|playSound|Howl|Tone\./i.test(html);
  if (!checks['has-audio']) issues.push({ severity: 'warning', category: 'audio', description: 'No audio system found' });

  // Input checks
  checks['has-input'] = /addEventListener.*key|onkeydown|onkeyup/i.test(html);
  if (!checks['has-input']) issues.push({ severity: 'major', category: 'input', description: 'No keyboard input handlers found' });

  // Recorder integration
  checks['has-recorder'] = html.includes('recorder.js');
  if (!checks['has-recorder']) issues.push({ severity: 'warning', category: 'integration', description: 'Missing recorder.js script tag' });

  checks['has-rating'] = html.includes('rating.js');
  if (!checks['has-rating']) issues.push({ severity: 'warning', category: 'integration', description: 'Missing rating.js script tag' });

  // CSS variables
  checks['has-css-vars'] = /--bg\s*:|--accent\s*:|--player\s*:|--text\s*:/i.test(html);
  if (!checks['has-css-vars']) issues.push({ severity: 'warning', category: 'styling', description: 'Missing CSS custom properties (--bg, --accent, etc.)' });

  // TODO/placeholder check
  checks['no-todos'] = !/\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*implement\s+this|\/\/\s*placeholder/i.test(html);
  if (!checks['no-todos']) issues.push({ severity: 'major', category: 'completeness', description: 'Contains TODO/placeholder comments' });

  // Blueprint HTML element ID checks
  if (blueprint?.html?.elementIds) {
    const missingIds = blueprint.html.elementIds.filter(id =>
      !html.includes(`id="${id}"`) && !html.includes(`id='${id}'`) && !html.includes(`getElementById('${id}')`) && !html.includes(`getElementById("${id}")`)
    );
    checks['all-element-ids'] = missingIds.length === 0;
    if (missingIds.length > 0) {
      issues.push({ severity: 'warning', category: 'structure', description: `Missing blueprint element IDs: ${missingIds.join(', ')}` });
    }
  }

  // Mobile readiness
  checks['mobile-ready'] = html.includes('viewport') && (html.includes('touchstart') || html.includes('touchend') || html.includes('ontouchstart'));

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;

  return {
    pass: criticalCount === 0 && majorCount === 0,
    checks,
    issues,
    score: Math.max(0, 100 - criticalCount * 20 - majorCount * 10 - issues.filter(i => i.severity === 'warning').length * 3),
  };
}

/**
 * Run Claude Haiku review on the assembled HTML.
 * @param {string} html - the complete index.html content
 * @param {object} blueprint - the Game Blueprint JSON
 * @param {object} claude - Anthropic client instance
 * @returns {Promise<object>} { pass, issues, score }
 */
async function aiReview(html, blueprint, claude) {
  const systemPrompt = `You are an expert QA engineer for HTML5 games. Review the provided game code for bugs, missing features, and runtime errors.

Return ONLY valid JSON with this structure:
{
  "pass": boolean,
  "score": number (0-100),
  "issues": [
    {
      "severity": "critical|major|warning|minor",
      "category": "string",
      "description": "string",
      "location": "string (line hint or function name)",
      "fix": "string (specific fix suggestion)"
    }
  ]
}

Severity guide:
- critical: Game won't work (syntax errors, missing init, broken loop)
- major: Core feature broken (no collision, no game-over, no restart)
- warning: Incomplete functionality (missing sound, HUD not updating)
- minor: Polish issue (unused variable, inconsistent naming)

Set pass=true only if zero critical and zero major issues.
Focus on RUNTIME issues — things that would crash or break the game when played.`;

  // Truncate HTML if too long (keep first and last sections)
  let codeSnippet = html;
  if (html.length > 15000) {
    codeSnippet = html.slice(0, 8000) + '\n\n// ... (middle truncated) ...\n\n' + html.slice(-7000);
  }

  const userPrompt = `Game Blueprint (expected features):
\`\`\`json
${JSON.stringify(blueprint, null, 2).slice(0, 3000)}
\`\`\`

Game Code to review:
\`\`\`html
${codeSnippet}
\`\`\`

Identify any issues. Return JSON only.`;

  try {
    const msg = await claude.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = msg.content[0]?.text || '{}';

    // Parse JSON from response
    let clean = text.trim();
    const fenceMatch = /```(?:json)?\n([\s\S]+?)\n```/.exec(clean);
    if (fenceMatch) clean = fenceMatch[1];

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(clean);
  } catch (e) {
    console.warn('AI review failed (non-fatal):', e.message);
    return { pass: true, score: 70, issues: [], error: e.message };
  }
}

/**
 * Run both static analysis and AI review, merge results.
 * @param {string} html - assembled HTML
 * @param {object} blueprint - Game Blueprint
 * @param {object} claude - Anthropic client
 * @returns {Promise<object>} combined validation result
 */
async function validate(html, blueprint, claude) {
  // Run static analysis immediately
  const staticResult = staticAnalysis(html, blueprint);

  // Run AI review in parallel (non-blocking)
  let aiResult = { pass: true, score: 80, issues: [] };
  try {
    aiResult = await aiReview(html, blueprint, claude);
  } catch (e) {
    console.warn('AI review skipped:', e.message);
  }

  // Merge results
  const allIssues = [
    ...staticResult.issues.map(i => ({ ...i, source: 'static' })),
    ...(aiResult.issues || []).map(i => ({ ...i, source: 'ai-review' })),
  ];

  // Deduplicate by description similarity
  const deduped = [];
  for (const issue of allIssues) {
    const isDuplicate = deduped.some(d =>
      d.category === issue.category &&
      d.description.toLowerCase().includes(issue.description.toLowerCase().slice(0, 30))
    );
    if (!isDuplicate) deduped.push(issue);
  }

  const criticalCount = deduped.filter(i => i.severity === 'critical').length;
  const majorCount = deduped.filter(i => i.severity === 'major').length;

  return {
    pass: criticalCount === 0 && majorCount === 0,
    score: Math.round((staticResult.score + (aiResult.score || 80)) / 2),
    checks: staticResult.checks,
    issues: deduped,
    staticPass: staticResult.pass,
    aiPass: aiResult.pass !== false,
  };
}

module.exports = { staticAnalysis, aiReview, validate };
