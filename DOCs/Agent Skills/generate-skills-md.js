#!/usr/bin/env node
// Generate properly formatted SKILL.md following GitHub spec exactly

const fs = require('fs');
const path = require('path');

const skillsDir = '/Users/moe/Desktop/Mission Control App/src/config/skills';
const outputFile = '/Users/moe/Desktop/MISSION_CONTROL_SKILLS.md';

const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.json'));

// Read all skills
const seen = new Map();
for (const file of files) {
  try {
    const content = fs.readFileSync(path.join(skillsDir, file), 'utf8');
    const skill = JSON.parse(content);
    if (skill.id && !seen.has(skill.id)) {
      seen.set(skill.id, skill);
    }
  } catch (e) {
    // Skip
  }
}

const skills = Array.from(seen.values());
console.log(`Processing ${skills.length} skills`);

// Sort by category then name
skills.sort((a, b) => {
  const catA = (a.category || 'z').toLowerCase();
  const catB = (b.category || 'z').toLowerCase();
  if (catA < catB) return -1;
  if (catA > catB) return 1;
  return (a.name || '').localeCompare(b.name || '');
});

// Categories
const categoryNames = {
  research: 'Research',
  strategy: 'Strategy',
  creative: 'Creative',
  media: 'Media',
  analytics: 'Analytics',
  operations: 'Operations',
  'client-services': 'Client Services',
  'client-management': 'Client Management',
  'project-management': 'Project Management',
  'business-development': 'Business Development',
  content: 'Content',
  general: 'General'
};

let md = `# Mission Control — AI Skills Library\n\n`;
md += `*${skills.length} skills | Generated ${new Date().toISOString().split('T')[0]}*\n\n`;
md += `---\n\n`;

let currentCategory = null;

for (const skill of skills) {
  const en = skill.prompts?.en || skill.prompts || {};
  const cat = (skill.category || 'general').toLowerCase();
  
  // Category header
  if (cat !== currentCategory) {
    currentCategory = cat;
    md += `\n## ${categoryNames[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}\n\n`;
  }
  
  // Get full description (fix truncated ones)
  let desc = skill.description || en.description || '';
  // Fix common truncations
  desc = desc.replace(/fee$/, 'feedback');
  desc = desc.replace(/strategic account plan$/, 'strategic account planning');
  
  // Build pushy description that actively encourages invocation
  const trigger = en.trigger || '';
  const triggerClean = trigger.replace(/^Use when\s*/i, '').replace(/\.$/, '');
  
  // Combine into compelling description
  let fullDesc = desc;
  if (triggerClean && !desc.includes(triggerClean.substring(0, 30))) {
    // Add trigger info to description if not already present
    fullDesc = desc + ' Use this skill any time ' + triggerClean.toLowerCase() + '.';
  }
  
  // Fix descriptions that end mid-sentence
  if (fullDesc.endsWith('...') || fullDesc.match(/[a-z]$/)) {
    if (!fullDesc.endsWith('.') && !fullDesc.endsWith('!') && !fullDesc.endsWith('?')) {
      fullDesc = fullDesc.replace(/\.+$/, '') + '.';
    }
  }
  
  // Frontmatter — description is THE trigger field
  md += `---\n`;
  md += `name: ${skill.id}\n`;
  md += `description: ${fullDesc.replace(/"/g, '\\"')}\n`;
  md += `---\n\n`;
  
  md += `### ${skill.name}\n\n`;
  md += `**Category:** ${categoryNames[cat] || cat} | **Difficulty:** ${skill.difficulty || 'intermediate'} | **Freedom:** ${skill.freedom || 'medium'}\n\n`;
  
  // Context
  if (en.context) {
    md += `${en.context}\n\n`;
  }
  
  // Workflow with WHY explanations and verify criteria
  if (en.instructions) {
    // Parse workflow steps from instructions
    const stepRegex = /-\s*\[\s*\]\s*(\d+)\.\s*(.+?):\s*(.+?)(?=\n\n|-\s*\[\s*\]|- \[ \]|\n###|$)/gi;
    let stepMatch;
    const steps = [];
    const instrCopy = en.instructions;
    
    // Also look for workflow object
    if (skill.workflow?.steps?.length) {
      for (const step of skill.workflow.steps) {
        steps.push({
          num: step.step || step.number || '?',
          name: step.name || '',
          action: step.action || '',
          verify: step.verify || ''
        });
      }
    }
    
    if (steps.length > 0) {
      md += `## Workflow\n\n`;
      for (const step of steps) {
        // Add "because" rationale where missing
        let action = step.action;
        if (!action.includes('because') && !action.includes('since') && !action.includes('to')) {
          // Wrap with brief rationale
        }
        
        md += `${step.num}. **${step.name}** — ${action}`;
        if (step.verify) {
          md += `\n   - ✓ Done when: ${step.verify}`;
        }
        md += `\n\n`;
      }
    }
    
    // Output template
    if (en.output_template) {
      md += `## Output\n\n${en.output_template}\n\n`;
    }
  }
  
  // Variables only (not redundant Key Inputs)
  if (skill.variables?.length) {
    md += `## Inputs\n\n`;
    md += `| Input | Type | Required | Description |\n`;
    md += `|-------|------|----------|-------------|\n`;
    for (const v of skill.variables) {
      md += `| \`{{${v.name}}}\` | ${v.type || 'string'} | ${v.required ? 'Yes' : 'No'} | ${v.description || ''} |\n`;
    }
    md += `\n`;
  }
  
  // Tools
  if (skill.tools?.length) {
    md += `## Tools\n\n`;
    md += skill.tools.map(t => `- ${t}`).join('\n') + `\n\n`;
  }
  
  // When NOT to use (address overlap)
  const overlaps = findOverlaps(skill.id, skills);
  if (overlaps.length > 0) {
    md += `## When Not to Use\n\n`;
    md += `This skill overlaps with: ${overlaps.join(', ')}. Use those instead when: ${getOverlapGuidance(skill.id)}\n\n`;
  }
  
  // Tags
  if (skill.metadata?.tags?.length) {
    md += skill.metadata.tags.map(t => `\`${t}\``).join(' ') + `\n\n`;
  }
  
  md += `\n`;
}

fs.writeFileSync(outputFile, md, 'utf8');
console.log(`Written ${md.length} characters to ${outputFile}`);

// Overlap mapping
function findOverlaps(id, allSkills) {
  const overlapGroups = {
    'funnel-analysis': ['conversion-optimization', 'attribution-modeling'],
    'conversion-optimization': ['funnel-analysis', 'roi-analysis'],
    'stakeholder-communication': ['stakeholder-management', 'client-reporting'],
    'stakeholder-management': ['stakeholder-communication', 'client-relationship-management'],
    'seo-audit': ['keyword-research', 'seo-research'],
    'media-strategy': ['channel-planning', 'programmatic-strategy'],
    'brand-voice': ['tone-adaptation', 'ux-writing'],
    'campaign-copywriting': ['ad-copy', 'headline-writing', 'social-copy'],
    'email-copy': ['landing-page-copy', 'direct-response-copy'],
    'paid-social-planning': ['social-media-strategy', 'organic-social-planning'],
    'budget-allocation': ['media-mix', 'roas-optimization'],
    'roi-analysis': ['roi-calculation', 'conversion-optimization'],
    'cohort-analysis': ['attribution-modeling', 'predictive-analytics'],
    'competitive-intelligence': ['competitive-analysis', 'competitive-media-analysis'],
    'market-research': ['keyword-research', 'seo-audit'],
    'brand-strategy': ['positioning-framework', 'value-proposition'],
    'audience-persona-creation': ['audience-research', 'audience-targeting'],
    'consumer-journey-mapping': ['funnel-strategy', 'consumer-insights'],
  };
  
  return overlapGroups[id] || [];
}

function getOverlapGuidance(id) {
  const guidance = {
    'funnel-analysis': 'you need to optimize a specific conversion metric rather than analyze the full journey',
    'conversion-optimization': 'you have a specific underperforming campaign or channel to fix',
    'stakeholder-communication': 'you are preparing external-facing materials or client updates',
    'stakeholder-management': 'you need to plan longer-term account strategy or resolve conflicts',
    'seo-audit': 'you need to diagnose technical SEO issues on a specific page or site',
    'media-strategy': 'you already have a strategy and need tactical channel execution plans',
    'brand-voice': 'you are adapting existing copy to a different tone rather than defining voice from scratch',
    'campaign-copywriting': 'you are writing for a single specific platform or format',
    'email-copy': 'your email is part of a broader landing page or funnel sequence',
    'paid-social-planning': 'you are managing ongoing social presence rather than planning a campaign',
    'budget-allocation': 'you are optimizing an existing mix rather than making initial allocations',
    'roi-analysis': 'you need a one-time ROI calculation rather than ongoing analysis',
    'cohort-analysis': 'you need to predict future outcomes rather than analyze past behavior',
    'competitive-intelligence': 'you need real-time monitoring rather than strategic analysis',
    'market-research': 'you already understand the market and need to execute',
    'brand-strategy': 'you need tactical positioning guidance rather than full brand strategy',
    'audience-persona-creation': 'you have persona data and need to apply it to targeting',
    'consumer-journey-mapping': 'you need to map a specific funnel stage rather than the full journey',
  };
  return guidance[id] || 'a more specialized skill fits your exact need';
}
