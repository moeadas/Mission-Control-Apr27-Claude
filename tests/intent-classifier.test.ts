/**
 * Intent classifier tests (Batch K)
 *
 * Locks in the routing behaviour for the seams the audit flagged most often:
 *   • "social post" early-return → campaign-copy (not creative-asset)
 *   • casual greetings → conversational
 *   • work requests → not conversational
 */
import { describe, expect, it } from 'vitest'

import {
  containsArabic,
  inferDeliverableType,
  isConversationalMessage,
  isSubstantiveRequest,
} from '@/lib/intents/intent-classifier'

describe('isConversationalMessage', () => {
  it('treats greetings as conversational', () => {
    expect(isConversationalMessage('hi')).toBe(true)
    expect(isConversationalMessage('Hello!')).toBe(true)
    expect(isConversationalMessage('thanks')).toBe(true)
    expect(isConversationalMessage('ok')).toBe(true)
    expect(isConversationalMessage('good morning')).toBe(true)
  })

  it('treats explicit "what can you do" as conversational', () => {
    expect(isConversationalMessage('What can Iris do?')).toBe(true)
    expect(isConversationalMessage('Show me the team')).toBe(true)
    expect(isConversationalMessage('What is the project status?')).toBe(true)
  })

  it('does NOT treat work requests as conversational', () => {
    expect(isConversationalMessage('Write me a LinkedIn post about our launch')).toBe(false)
    expect(isConversationalMessage('I need a content calendar for next month')).toBe(false)
    expect(isConversationalMessage('Please create a strategy brief for Acme')).toBe(false)
  })

  it('does NOT treat strategic-signal heavy messages as conversational', () => {
    expect(isConversationalMessage('Help me figure out our target audience and value proposition')).toBe(false)
  })
})

describe('isSubstantiveRequest', () => {
  it('detects action-verb requests', () => {
    expect(isSubstantiveRequest('Create a content plan for Q4')).toBe(true)
    expect(isSubstantiveRequest('Analyse our funnel drop-off')).toBe(true)
  })

  it('treats short greetings as non-substantive', () => {
    expect(isSubstantiveRequest('hi')).toBe(false)
    expect(isSubstantiveRequest('ok')).toBe(false)
  })
})

describe('inferDeliverableType', () => {
  it('routes social-post requests to campaign-copy (not creative-asset)', () => {
    // Regression for audit finding H-34 / Fix #91 — social-post phrasings must
    // not slip into the creative-asset engine, which produces a brief, not copy.
    expect(inferDeliverableType('Write me an Instagram post for the launch')).toBe('campaign-copy')
    expect(inferDeliverableType('Draft a LinkedIn post about our hiring')).toBe('campaign-copy')
    expect(inferDeliverableType('Create a single post for Facebook')).toBe('campaign-copy')
  })

  it('still allows creative-asset for explicit visual requests', () => {
    expect(inferDeliverableType('Generate an image for our hero banner')).toBe('creative-asset')
    expect(inferDeliverableType('Design a poster for the event')).toBe('creative-asset')
  })

  it('routes content-calendar requests correctly', () => {
    expect(inferDeliverableType('Plan our 30-day content calendar for Instagram and LinkedIn')).toBe('content-calendar')
    expect(inferDeliverableType('Build a monthly content plan')).toBe('content-calendar')
  })

  it('routes strategy briefs', () => {
    expect(inferDeliverableType('Help me write a brand positioning strategy')).toBe('strategy-brief')
    expect(inferDeliverableType('I need a go-to-market plan for our B2B SaaS')).toBe('strategy-brief')
  })

  it('returns status-report for empty / very short inputs', () => {
    expect(inferDeliverableType('')).toBe('status-report')
    expect(inferDeliverableType('hi')).toBe('status-report')
  })
})

describe('Arabic language support (H-32)', () => {
  it('detects Arabic characters', () => {
    expect(containsArabic('مرحبا')).toBe(true)
    expect(containsArabic('hello مرحبا')).toBe(true)
    expect(containsArabic('hello')).toBe(false)
    expect(containsArabic('')).toBe(false)
  })

  it('treats Arabic greetings as conversational', () => {
    expect(isConversationalMessage('مرحبا')).toBe(true)
    expect(isConversationalMessage('أهلا')).toBe(true)
    expect(isConversationalMessage('السلام عليكم')).toBe(true)
    expect(isConversationalMessage('شكرا')).toBe(true)
    expect(isConversationalMessage('صباح الخير')).toBe(true)
  })

  it('does NOT treat Arabic work requests as conversational', () => {
    expect(isConversationalMessage('اكتب لي منشور انستغرام عن إطلاق منتجنا الجديد')).toBe(false)
    expect(isConversationalMessage('أحتاج تقويم محتوى لشهر القادم')).toBe(false)
    expect(isConversationalMessage('صمم لي حملة تسويقية لشركتنا')).toBe(false)
    expect(isConversationalMessage('ساعدني في تحديد الجمهور المستهدف والقيمة المقترحة')).toBe(false)
  })

  it('flags Arabic action verbs as substantive', () => {
    expect(isSubstantiveRequest('اكتب لي خطة محتوى ربع سنوية')).toBe(true)
    expect(isSubstantiveRequest('حلل أداء قمع المبيعات لدينا')).toBe(true)
    expect(isSubstantiveRequest('ابحث عن المنافسين في السوق')).toBe(true)
  })

  it('routes Arabic Instagram-post requests to campaign-copy', () => {
    expect(inferDeliverableType('اكتب منشور انستغرام عن منتجنا الجديد')).toBe('campaign-copy')
    expect(inferDeliverableType('اعمل لي بوست لينكدإن عن التوظيف')).toBe('campaign-copy')
    expect(inferDeliverableType('اكتب كابشن لمنشور فيسبوك')).toBe('campaign-copy')
  })

  it('routes Arabic visual requests to creative-asset', () => {
    expect(inferDeliverableType('صمم لي بانر للحملة')).toBe('creative-asset')
    expect(inferDeliverableType('اعمل لي بوستر للفعالية')).toBe('creative-asset')
  })

  it('routes Arabic content-calendar requests', () => {
    expect(inferDeliverableType('اعمل لي تقويم محتوى لشهر كامل')).toBe('content-calendar')
  })

  it('routes Arabic strategy briefs', () => {
    expect(inferDeliverableType('احتاج خطة تموضع وهوية للعلامة التجارية')).toBe('strategy-brief')
  })

  it('handles mixed Arabic + English correctly', () => {
    expect(isConversationalMessage('اكتب لي an Instagram post')).toBe(false)
    expect(inferDeliverableType('اكتب لي an Instagram post for the launch')).toBe('campaign-copy')
  })
})
