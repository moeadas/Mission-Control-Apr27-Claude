#!/usr/bin/env node
// Parse skills-audit.txt and generate properly formatted SKILL.md files

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'skills-audit.txt');
const outputFile = path.join(__dirname, 'MISSION_CONTROL_SKILLS.md');

const content = fs.readFileSync(inputFile, 'utf8');

// Split into skill blocks
const blockRegex = /=+\nSKILL: (.+?)\n=+\nFile: (src\/config\/skills\/[^\n]+)\n\n/g;
const blocks = [];
let match;
while ((match = blockRegex.exec(content)) !== null) {
  blocks.push({
    header: match[0],
    nameLine: match[1],
    filePath: match[2]
  });
}

// Find JSON for each block
const skills = [];
const jsonRegex = /\{[\s\S]*?"id":\s*"([^"]+)"[\s\S]*?"workflow":\s*\{[\s\S]*?"steps":\s*(\[[\s\S]*?\])[\s\S]*?\}/g;

for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i];
  const startIdx = block.header.length + content.indexOf(block.header) + block.header.length;
  const endIdx = i < blocks.length - 1 
    ? content.indexOf(blocks[i + 1].header) 
    : content.length;
  
  let jsonStr = content.substring(startIdx, endIdx).trim();
  
  // Find the JSON object (starts with {)
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    
    try {
      const skill = JSON.parse(jsonStr);
      skills.push({ block, skill });
    } catch (e) {
      console.error(`Error parsing ${block.nameLine}: ${e.message}`);
    }
  }
}

console.log(`Found ${skills.length} skills`);

// Deduplicate by id
const seen = new Set();
const unique = skills.filter(({ skill }) => {
  if (seen.has(skill.id)) {
    console.log(`Duplicate: ${skill.id}`);
    return false;
  }
  seen.add(skill.id);
  return true;
});

console.log(`Unique skills: ${unique.length}`);

// Generate markdown
let md = `# Mission Control — AI Skills Library\n\n`;
md += `*Generated from skills audit — ${unique.length} skills | ${new Date().toISOString().split('T')[0]}*\n\n`;
md += `---\n\n`;

for (const { skill } of unique) {
  const en = skill.prompts?.en || skill.prompts || {};
  
  // Frontmatter
  md += `---\n`;
  md += `name: ${skill.id}\n`;
  md += `description: ${skill.description?.replace(/"/g, '\\"') || ''}\n`;
  md += `---\n\n`;
  
  // Title
  md += `# ${skill.name}\n\n`;
  
  // Category, difficulty, freedom
  md += `**Category:** ${skill.category || 'general'} | **Difficulty:** ${skill.difficulty || 'intermediate'} | **Freedom:** ${skill.freedom || 'medium'}\n\n`;
  
  // Trigger
  md += `## When to Use\n\n`;
  md += `${en.trigger || en.description || skill.description || 'No description provided.'}\n\n`;
  
  // Context
  md += `## Context\n\n`;
  md += `${en.context || 'You are a specialist.'}\n\n`;
  
  // Instructions
  md += `## Instructions\n\n`;
  if (en.instructions) {
    md += en.instructions + `\n\n`;
  } else if (skill.workflow?.steps) {
    md += `Complete these steps:\n\n`;
    for (const step of skill.workflow.steps) {
      md += `- [ ] ${step.step}. ${step.name}: ${step.action}\n`;
    }
    md += `\n`;
  }
  
  // Output template
  if (en.output_template) {
    md += `## Output\n\n`;
    md += en.output_template + `\n\n`;
  }
  
  // Variables
  if (skill.variables?.length) {
    md += `## Variables\n\n`;
    md += `| Variable | Type | Required | Description |\n`;
    md += `|----------|------|----------|-------------|\n`;
    for (const v of skill.variables) {
      md += `| ${v.name} | ${v.type || 'string'} | ${v.required ? 'Yes' : 'No'} | ${v.description || ''} |\n`;
    }
    md += `\n`;
  }
  
  // Workflow
  if (skill.workflow?.steps?.length) {
    md += `## Workflow\n\n`;
    md += `| Step | Name | Action | Verification |\n`;
    md += `|------|------|--------|--------------|\n`;
    for (const step of skill.workflow.steps) {
      md += `| ${step.step} | ${step.name} | ${step.action} | ${step.verify || '-'} |\n`;
    }
    md += `\n`;
  }
  
  // Tools
  if (skill.tools?.length) {
    md += `## Tools\n\n`;
    md += skill.tools.map(t => `- ${t}`).join('\n') + `\n\n`;
  }
  
  // Tags
  if (skill.metadata?.tags?.length) {
    md += `## Tags\n\n`;
    md += skill.metadata.tags.map(t => `\`${t}\``).join(' ') + `\n\n`;
  }
  
  md += `---\n\n`;
}

fs.writeFileSync(outputFile, md, 'utf8');
console.log(`Written to ${outputFile}`);
console.log(`Total characters: ${md.length}`);
