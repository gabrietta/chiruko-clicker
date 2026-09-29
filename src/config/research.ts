export const RESEARCH_BRANCHES = [
  { id: 'production', name: '生産星図', description: '銀河の工場をつなぎ、自動生産を押し上げる。', flavor: '星々のあいだに、満足の流れが見える。' },
  { id: 'click', name: '共鳴星図', description: '指先とおでこの共鳴を研究し、ひとさわりを強める。', flavor: '触れた瞬間、遠い星も少しだけ笑う。' },
  { id: 'offline', name: '夢見星図', description: '眠りのあいだに満足を育てる航路を描く。', flavor: '夢の中にも、研究所の明かりが灯る。' },
] as const

export const RESEARCH_COSTS = [1e24, 5e24, 2e25, 1e26] as const
export const RESEARCH_DURATIONS = [900, 3600, 14400, 43200] as const
export const RESEARCH_SORA4_REQUIREMENT = 50

