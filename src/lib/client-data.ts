export interface KnowledgeAsset {
  id: string
  title: string
  type: 'doc' | 'pdf' | 'sheet' | 'link' | 'note'
  path?: string
  summary: string
  extractedInsights?: string
  status: 'reference' | 'needs-review' | 'synced'
  lastReviewedAt?: string
}

export type BrandAssetType = 'logo' | 'reference-image' | 'template' | 'font-file' | 'moodboard'

export interface BrandAsset {
  id: string
  type: BrandAssetType
  title: string
  fileName?: string
  url: string
  path?: string
  notes?: string
  createdAt: string
}

export interface ClientBrandKit {
  colors: string[]
  fonts: string[]
  visualKeywords: string
  lookAndFeel: string
  photoStyle: string
  compositionRules: string
  negativeRules: string
  logos: BrandAsset[]
  templates: BrandAsset[]
  referenceImages: BrandAsset[]
  fontFiles: BrandAsset[]
}

export interface Client {
  id: string
  ownerUserId?: string
  name: string
  industry: string
  website?: string
  description: string
  missionStatement: string
  brandPromise: string
  targetAudiences: string
  productsAndServices: string
  usp: string
  competitiveLandscape: string
  keyMessages: string
  toneOfVoice: string
  operationalDetails: string
  objectionHandling: string
  brandIdentityNotes: string
  strategicPriorities: string
  brandKit: ClientBrandKit
  competitors: string[]
  knowledgeAssets: KnowledgeAsset[]
  notes: string
  createdAt: string
  updatedAt: string
}

const now = new Date().toISOString()

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'victory-genomics',
    name: 'Victory Genomics',
    industry: 'Equine Genomics / Biotechnology',
    website: 'https://www.victorygenomics.com',
    description:
      'Global equine genomics company offering whole genome sequencing for horses, positioned at the intersection of human-grade genomic science and the equine industry.',
    missionStatement:
      `Unlock the full genetic story of every horse through whole genome sequencing and translate that science into simple, actionable insight. Core belief: "There's more to your horse than meets the eye."`,
    brandPromise:
      'One test for the entirety of a horse’s life, with updated results delivered as new variants and discoveries emerge.',
    targetAudiences:
      'Horse owners, breeders, trainers, bloodstock agents, veterinary professionals, and stables/farms that want better-informed decisions around health, heritage, performance, and breeding.',
    productsAndServices:
      'Arabian VGnome, Thoroughbred VGnome, Anglo-Arabian VGnome, VGenius bespoke consultative genomics, and paid genetic counseling.',
    usp:
      'World’s only equine DNA testing company using whole genome sequencing rather than panel testing; one-test-for-life model; breed-specific reporting; human-grade security and quality standards; in-house discovery and ongoing customer updates.',
    competitiveLandscape:
      'Competes against Etalon, Animal Genetics, UC Davis VGL, Plusvital/Equinome, Weatherbys Scientific, Texas A&M Animal Genetics Laboratory, and DNA My Horse. Victory differentiates through comprehensiveness, future-proofing, strategic depth, and stronger privacy/security posture.',
    keyMessages:
      `There’s more to your horse than meets the eye. One test for the entirety of your horse’s life. The world’s only whole genome sequencing for horses. Updated results pushed in hours. 20,000 genes. 5.5 million variants. 4 billion letters of DNA. We’re a discovery company, not just a testing company.`,
    toneOfVoice:
      'Scientific authority balanced with passionate accessibility. Confident, educational, emotionally connected to horse owners, action-oriented, and reassuring on privacy and security.',
    operationalDetails:
      'Accepts blood or hair samples globally. Typical turnaround is 30–40 working days with expedited options. Results delivered via secure online portal or email. DNA stored for 12 months post-testing. Major cards, money orders, and direct transfers accepted.',
    objectionHandling:
      'Higher upfront price is framed as long-term cost efficiency versus repeated panel retesting. Genetics is positioned as a decision-support tool rather than a deterministic verdict. Privacy concerns are addressed through strict confidentiality. Inconclusive findings are revisited as science evolves.',
    brandIdentityNotes:
      'Company abbreviation is VG. Product naming convention uses VGnome and VGenius with capital V and G. Signature creative data points: 20,000 genes, 5.5 million variants, 4 billion letters of DNA.',
    strategicPriorities:
      'Build category education around whole genome sequencing versus panel tests, reinforce premium one-test-for-life positioning, create breed-specific messaging, and arm sales/partner teams with stronger competitive comparison content.',
    brandKit: {
      colors: ['#151b2f', '#4f8ef7', '#00d4aa', '#f7f5ff'],
      fonts: ['Neue Haas Grotesk', 'IBM Plex Sans'],
      visualKeywords: 'premium biotech, equine editorial, scientific clarity, modern data visualization, clean luxury',
      lookAndFeel:
        'Premium, science-forward, editorial, calm confidence. Visuals should feel trustworthy, modern, and high-value rather than noisy or promotional.',
      photoStyle:
        'Clean equine portraiture, premium stable environments, genomic/scientific overlays, natural light, restrained contrast, refined color grading.',
      compositionRules:
        'Use generous whitespace, clear focal hierarchy, elegant data-driven overlays, and strong mobile-safe compositions. Keep type legible and premium.',
      negativeRules:
        'Avoid generic neon sci-fi DNA visuals, cluttered lab clichés, meme-style layouts, exaggerated medical imagery, and off-brand novelty illustrations.',
      logos: [],
      templates: [],
      referenceImages: [],
      fontFiles: [],
    },
    competitors: [
      'Etalon Equine Genetics',
      'Animal Genetics Inc.',
      'UC Davis Veterinary Genetics Laboratory',
      'Plusvital / Equinome Labs',
      'Weatherbys Scientific',
      'Texas A&M Animal Genetics Laboratory',
      'DNA My Horse',
    ],
    knowledgeAssets: [
      {
        id: 'vg-brand-brief',
        title: 'Victory Genomics Brand Briefing',
        type: 'doc',
        path: '/Volumes/MOE BOX/Downloads 2026/donwloads march 2026/Victory-Genomics/Documents/# Victory Genomics — Brand Briefing.md',
        summary: 'Master internal brand, product, audience, competitor, and messaging reference for Victory Genomics.',
        extractedInsights:
          'Use as the core knowledge source for positioning, audience segmentation, product messaging, competitive claims, objection handling, and brand voice.',
        status: 'synced',
        lastReviewedAt: now,
      },
    ],
    notes:
      'High-value premium biotech/equine client. Messaging should always protect scientific credibility while staying understandable for horse owners and breeders.',
    createdAt: now,
    updatedAt: now,
  },
]
