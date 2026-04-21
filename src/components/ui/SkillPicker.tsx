'use client'

import React, { useState, useEffect } from 'react'
import { X, Search, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import { useSkillsStore } from '@/lib/stores/skills-store'

interface Skill {
  id: string
  name: string
  description: string
  category: string
}

interface SkillPickerProps {
  selectedSkillIds: string[]
  onAddSkill: (skillId: string) => void
  onRemoveSkill: (skillId: string) => void
}

export function SkillPicker({ selectedSkillIds, onAddSkill, onRemoveSkill }: SkillPickerProps) {
  const categories = useSkillsStore(s => s.categories)
  const skillsMap = useSkillsStore(s => s.skillsMap)
  const isLoaded = useSkillsStore(s => s.isLoaded)
  const loadSkills = useSkillsStore(s => s.loadSkills)

  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => { loadSkills() }, [loadSkills])

  // Build flat skill list from store
  const availableSkills: Skill[] = Object.values(skillsMap)

  // Group skills by category
  const grouped = categories.reduce((acc, cat) => {
    const catSkills = cat.skills.filter(s =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
    )
    if (catSkills.length) acc[cat.id] = { name: cat.name, skills: catSkills }
    return acc
  }, {} as Record<string, { name: string; skills: Skill[] }>)

  const selectedSkills = availableSkills.filter(s => selectedSkillIds.includes(s.id))

  return (
    <div className="space-y-3">
      {/* Selected Skills */}
      <div className="flex flex-wrap gap-2">
        {selectedSkills.length === 0 && (
          <span className="text-xs text-gray-500 italic">No skills selected — click "Add Skill" to browse</span>
        )}
        {selectedSkills.map(skill => (
          <span
            key={skill.id}
            className="px-3 py-1.5 bg-[#1a1d26] rounded-lg text-xs flex items-center gap-2 text-white border border-[#2a2d38] group"
          >
            <div>
              <span className="font-medium">{skill.name}</span>
              <span className="text-gray-500 ml-1">({skill.category})</span>
            </div>
            <button
              onClick={() => onRemoveSkill(skill.id)}
              className="text-gray-500 hover:text-red-400 ml-1"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      {/* Add Skill Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-gray-300 hover:border-accent-purple hover:text-white transition-colors"
      >
        <Plus size={16} className="text-accent-purple" />
        {showPicker ? 'Close Skill Picker' : 'Add Skill from Library'}
      </button>

      {/* Skill Picker Dropdown */}
      {showPicker && (
        <div className="bg-[#12141a] border border-[#2a2d38] rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-10 pr-4 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-accent-purple"
            />
          </div>

          {!isLoaded ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Categories */}
              {Object.entries(grouped).map(([catId, { name, skills }]) => (
                <div key={catId} className="border border-[#2a2d38] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === catId ? null : catId)}
                    className="w-full px-3 py-2 bg-[#1a1d26] flex items-center justify-between text-sm font-medium text-gray-200 hover:bg-[#252830]"
                  >
                    <span>{name} <span className="text-gray-500">({skills.length})</span></span>
                    {expandedCategory === catId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expandedCategory === catId && (
                    <div className="divide-y divide-[#2a2d38]">
                      {skills.map(skill => {
                        const isSelected = selectedSkillIds.includes(skill.id)
                        return (
                          <button
                            key={skill.id}
                            onClick={() => isSelected ? onRemoveSkill(skill.id) : onAddSkill(skill.id)}
                            className={clsx(
                              'w-full px-3 py-2 text-left text-sm transition-colors',
                              isSelected
                                ? 'bg-accent-purple/20 text-accent-purple'
                                : 'hover:bg-[#1a1d26] text-gray-300'
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-medium">{skill.name}</span>
                                {isSelected && <span className="text-xs ml-2">(Selected)</span>}
                              </div>
                              {isSelected ? (
                                <X size={16} className="text-accent-purple" />
                              ) : (
                                <Plus size={16} className="text-gray-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{skill.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}

              {Object.keys(grouped).length === 0 && (
                <p className="text-center text-gray-500 py-4 text-sm">No skills match your search</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
