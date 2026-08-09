export interface DialogueContext {
  hour: number
  manualClicks: number
  totalSatisfaction: number
  perSecond: number
  inventory: Record<string, number>
  activeBuffNames: string[]
  selectedCharacterSkin: string
}

const BASE_DIALOGUES = [
  '今日の小さな満足に、感謝いたしましょう。',
  'ごきげんよう。本日もほどほどに満たされてまいりましょう。',
  '満足は逃げませんわ。たぶん。ですので、焦らずどうぞ。',
  '教義は簡単ですの。嬉しかったら、それが満足ですわ。',
  '数字が増える様子は、いつ見てもよいものですわね。',
  'わたくしを眺める時間も、立派な活動記録ですのよ。',
  '今日も世界のすみっこから、静かに布教中ですわ。',
  '難しいことは明日のわたくしに任せましょう。',
  '休憩もまた満足。異論は認めますけれど、聞き流しますわ。',
  '満たされておりますか？ まだなら、もうひとさわりどうぞ。',
  '大丈夫ですわ。だいたいのことは、おやつと睡眠で整います。',
  'その熱意、救済印を押して差し上げたいくらいですわ。',
]

const TIME_DIALOGUES = {
  lateNight: [
    '夜更かしの信者には、あたたかい飲み物を推奨いたしますわ。',
    '深夜の満足は、昼より少しだけ秘密めいておりますの。',
    '眠れない夜ですの？ では、静かに数字を増やしましょう。',
  ],
  morning: [
    'おはようございます。朝の満足を一杯どうぞ。',
    '起きられただけで、本日はすでに一徳ですわ。',
    '朝一番のひとさわり、確かに受け取りました。',
  ],
  daytime: [
    'お昼の布教活動、お疲れさまですわ。',
    '日の高いうちから熱心ですこと。よい心がけですわ。',
    'おやつの時間まで、満足を貯めておきましょう。',
  ],
  evening: [
    '本日も一日、お疲れさまでした。ここではゆるりとどうぞ。',
    '夕暮れは、増えた数字を眺めるのによい時間ですわね。',
    'そろそろ、ふかふかおふとんの御利益が恋しい頃ですわ。',
  ],
}

const FACILITY_DIALOGUES: Record<string, string[]> = {
  petting: [
    'おでこは出ておりますけれど、丁重にお願いいたしますわ。',
    'なでなでは回数より心ですの。回数も嬉しいですけれど。',
  ],
  'sweet-treat': [
    'あまいおやつは、教義よりも人をまとめる力がありますわ。',
    '糖分による救済は、たいへん即効性がございます。',
  ],
  'soft-futon': [
    'ふかふかのおふとんこそ、文明がたどり着いた答えですわ。',
    'あと五分だけ……という祈りは、世界共通ですのね。',
  ],
  'chiruko-doll': [
    '人形のわたくしも、ちゃんとおでこが見えておりますわね。',
    'ちる子ちゃん人形は、本人監修ということになっております。',
  ],
  'desktop-accessory': [
    'PCのすみは落ち着きますわ。邪魔にならない程度に働きます。',
    '閉じないでいただければ、こつこつ満たしておきますわ。',
  ],
  'sora-2': [
    'この布教活動、映像と音声で記録しておきましょう。',
    '想像した景色が動き出すなんて、よい時代ですわね。',
  ],
  believer: [
    '信者が増えましたわ。教義は……追って決めましょう。',
    '入信は自由、退会も自由。満足だけ持ち帰ってくださいませ。',
  ],
  altar: [
    '荘厳さと効率。どちらも譲れませんの。',
    '祭壇のお手入れは、柔らかい布でお願いいたします。',
  ],
  'giant-statue': [
    'よくここまで満たしましたわね。見上げてもよろしくてよ。',
    '像のほうが本人より立派、というご意見は受け付けておりません。',
  ],
  'ramen-sanctum': [
    '深夜の一杯には、抗いがたい救済がありますの。',
    '替え玉は御利益に含まれます。たぶん。',
  ],
  'cult-broadcast': [
    '本日の放送も、内容より雰囲気を重視しております。',
    'こちら満足放送局。受信状態はいかがでしょうか。',
  ],
  'neo-cathedral': [
    '仮設支部がずいぶん立派になりましたこと。',
    '大聖堂でも、やることはいつも通りのひとさわりですわ。',
  ],
  'dimension-gate': [
    '向こう側の世界にも、おすそ分けいたしましょう。',
    '次元を越えてまで布教するとは、ずいぶん遠くへ来ましたわね。',
  ],
  'cosmic-chiruko': [
    '銀河にも満足を。教義は到着までに考えますわ。',
    '宇宙船の窓から見る満足も、なかなか壮観ですの。',
  ],
  'sora-3': [
    '架空の進化も、信じればだいたい満足ですわ。',
    'Sora3が描く未来では、満足が光速を越えるそうですの。',
  ],
  'satisfaction-observatory': [
    '天文台から見る満足の星は、ひとつひとつ違う色に見えるそうですわ。',
    '遠くを観測するほど、次に届けたい満足が見つかりますの。',
  ],
  'galaxy-mission-fleet': [
    '艦隊が銀河の向こうまで、満足の便りを運んでいますわ。',
    '船団の航路が増えるほど、宇宙は少しずつ優しくなりますの。',
  ],
  'satisfaction-simulator': [
    '宇宙を丸ごとシミュレートして、満足の増え方を予習中ですわ。',
    '計算結果はいつも、予想より少しだけ満足寄りですの。',
  ],
  'sora-4': [
    '赤い雲が怒っているように見えても、夢を出力する準備中ですわ。',
    'Sora4の夢想圏から、まだ名前のない満足が届きましたの。',
  ],
}

const getTimeDialogues = (hour: number) => {
  if (hour < 5) return TIME_DIALOGUES.lateNight
  if (hour < 11) return TIME_DIALOGUES.morning
  if (hour < 17) return TIME_DIALOGUES.daytime
  return TIME_DIALOGUES.evening
}

export const getDialogueCandidates = (context: DialogueContext) => {
  const lines = [...BASE_DIALOGUES, ...getTimeDialogues(context.hour)]

  if (context.manualClicks >= 20) lines.push('熱心ですこと。おでこは丁重にお願いいたしますわ。')
  if (context.manualClicks >= 100) lines.push('百回も？ その情熱、もはやひとつの教義ですわね。')
  if (context.manualClicks >= 1_000) lines.push('千のひとさわり……おでこが功徳で輝きそうですわ。')
  if (context.perSecond > 0) lines.push('何もしない時間にも、満足は育ちますの。')
  if (context.perSecond >= 1_000) lines.push('もう手動より設備の皆さまのほうが働いておりますわね。')
  if (context.perSecond >= 1_000_000) lines.push('一秒ごとの満足が、ちょっとした災害の規模ですわ。')
  if (context.totalSatisfaction >= 1_000_000_000) lines.push('ここまで来ると、数字というより景色ですわね。')

  for (const [itemId, itemLines] of Object.entries(FACILITY_DIALOGUES)) {
    if ((context.inventory[itemId] ?? 0) > 0) lines.push(...itemLines)
  }

  if (context.activeBuffNames.length === 1) {
    lines.push(`${context.activeBuffNames[0]}が来ております。今のうちですわ！`)
  } else if (context.activeBuffNames.length >= 2) {
    lines.push('奇跡が重なっております！ 理屈はあとで考えましょう！')
    lines.push('コンボ中ですわ。いまは数字だけをご覧なさいませ！')
  }

  if (context.selectedCharacterSkin === 'sleep') lines.push('眠っているように見えて、自動生産は働いておりますの。')
  if (context.selectedCharacterSkin === 'read') lines.push('教典を読んでおります。まだ白紙のページが多いですわ。')
  if (context.selectedCharacterSkin === 'run') lines.push('走っておりますけれど、目的地は特に決めておりません。')

  return [...new Set(lines)]
}
