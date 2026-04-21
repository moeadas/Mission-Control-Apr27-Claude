#!/usr/bin/env node
// Parse MissionControlSkills_Revised.txt - already well-structured

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'MissionControlSkills_Revised.txt');
const outputFile = path.join(__dirname, 'MISSION_CONTROL_SKILLS.md');

let content = fs.readFileSync(inputFile, 'utf8');

// Remove RTF artifacts
content = content.replace(/\\r/g, '');
content = content.replace(/\\n/g, '\n');
content = content.replace(/\n{3,}/g, '\n\n');

// Split by skill headers
const skillBlocks = content.split(/══════════════════════════════════════════════════════════════════════/);

let skills = [];
let currentSkill = null;

for (const block of skillBlocks) {
  // Skip header block
  if (block.includes('MISSION CONTROL — AI SKILLS LIBRARY')) continue;
  if (block.includes('SKILL INDEX BY CATEGORY')) continue;
  if (block.includes('CHANGES FROM ORIGINAL FILE')) continue;
  
  // New skill starts with category header
  const catMatch = block.match(/^\s*█+\s+CATEGORY:\s+(\w+)\s+█/);
  if (catMatch) {
    currentSkill = { category: catMatch[1].toLowerCase() };
    continue;
  }
  
  // Skill content
  if (block.includes('SKILL') && block.includes('id')) {
    try {
      // Extract id
      const idMatch = block.match(/id\s+(.+?)(?:\n|\s{2,})/);
      // Extract name
      const nameMatch = block.match(/(?:SKILL \d+ — |name\s+|ID\s+(.+?)\n)[\s-]*(.+?)(?:\n|(?:\s{2,})(?:category|trigg|desc))/i);
      // Extract description
      const descMatch = block.match(/(?:DESCRIPTION|description)[\s\n]+(.+?)(?:\n\s{2,}TRIGGER|\n\s{2,}CONTEXT|\n\s{2,}INSTRUCTIONS)/is);
      // Extract trigger
      const triggerMatch = block.match(/(?:TRIGGER|trigger)[\s\n]+(.+?)(?:\n\s{2,}CONTEXT|\n\s{2,}INSTRUCTIONS)/is);
      // Extract context
      const contextMatch = block.match(/CONTEXT[\s\n]+(.+?)(?:\n\s{2,}INSTRUCTIONS|\n\s{2,}OUTPUT)/is);
      // Extract instructions
      const instrMatch = block.match(/INSTRUCTIONS[\s\n]+(.+?)(?:\n\s{2,}OUTPUT|\n\s{2,}VARIABLES)/is);
      // Extract variables
      const varsMatch = block.match(/VARIABLES[\s\n]+(.+?)(?:\n\s{2,}WORKFLOW|\n\s{2,}TOOLS)/is);
      // Extract workflow steps
      const workflowMatch = block.match(/WORKFLOW[\s\n]+(.+?)(?:\n\s{2,}TOOLS|\n\s{2,}AGENTS|\n\s{2,}TAGS)/is);
      // Extract difficulty
      const diffMatch = block.match(/difficulty[\s]+(\w+)/i);
      // Extract freedom
      const freeMatch = block.match(/freedom[\s]+(\w+)/i);
      // Extract tools
      const toolsMatch = block.match(/TOOLS[\s]+(.+?)(?:\n|AGENTS|PIPELINES|TAGS)/i);
      // Extract tags
      const tagsMatch = block.match(/TAGS[\s]+(.+?)(?:\n|$)/i);
      
      // Extract version
      const verMatch = block.match(/version[\s]+([\d.]+)/i);
      
      if (idMatch) {
        currentSkill.id = idMatch[1].trim();
      }
      
      if (currentSkill.id && block.trim().length > 100) {
        skills.push({
          id: currentSkill.id || idMatch?.[1]?.trim() || 'unknown',
          category: currentSkill.category || 'general',
          name: nameMatch?.[2]?.trim() || currentSkill.id,
          description: descMatch?.[1]?.trim() || '',
          trigger: triggerMatch?.[1]?.trim() || '',
          context: contextMatch?.[1]?.trim() || '',
          instructions: instrMatch?.[1]?.trim() || '',
          variables: varsMatch?.[1]?.trim() || '',
          workflow: workflowMatch?.[1]?.trim() || '',
          difficulty: diffMatch?.[1]?.trim() || 'intermediate',
          freedom: freeMatch?.[1]?.trim() || 'medium',
          tools: toolsMatch?.[1]?.trim() || '',
          tags: tagsMatch?.[1]?.trim() || '',
          version: verMatch?.[1]?.trim() || '1.0'
        });
      }
    } catch (e) {
      // Skip problematic blocks
    }
  }
}

// Deduplicate by id
const seen = new Set();
const unique = [];
for (const s of skills) {
  if (!seen.has(s.id)) {
    seen.add(s.id);
    unique.push(s);
  }
}

console.log(`Found ${unique.length} unique skills`);

// Generate markdown
let md = `# Mission Control — AI Skills Library\n\n`;
md += `*${unique.length} skills | Generated ${new Date().toISOString().split('T')[0]}*\n\n`;
md += `---\n\n`;

for (const s of unique) {
  // Frontmatter
  md += `---\n`;
  md += `name: ${s.id}\n`;
  md += `description: ${(s.description || s.trigger || '').substring(0, 200).replace(/"/g, '\\"')}\n`;
  md += `---\n\n`;
  
  md += `# ${s.name}\n\n`;
  md += `**Category:** ${s.category} | **Difficulty:** ${s.difficulty} | **Freedom:** ${s.freedom}\n\n`;
  
  if (s.trigger) {
    md += `## When to Use\n\n${s.trigger}\n\n`;
  }
  
  if (s.context) {
    md += `## Context\n\n${s.context}\n\n`;
  }
  
  if (s.instructions) {
    md += `## Instructions\n\n${s.instructions}\n\n`;
  }
  
  if (s.workflow) {
    md += `## Workflow\n\n${s.workflow}\n\n`;
  }
  
  if (s.tools) {
    md += `## Tools\n\n${s.tools}\n\n`;
  }
  
  if (s.tags) {
    md += `## Tags\n\n${s.tags}\n\n`;
  }
  
  md += `---\n\n`;
}

fs.writeFileSync(outputFile, md, 'utf8');
console.log(`Written ${md.length} characters to ${outputFile}`);
