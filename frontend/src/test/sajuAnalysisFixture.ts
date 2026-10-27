import type { SajuAnalysisResponse } from '../features/saju/types'

export function sajuAnalysisResponse(
  content = '전체 사주 분석 결과입니다.',
): SajuAnalysisResponse {
  const paragraph = {
    content,
    evidence: [
      {
        source: 'pillars.day.heavenlyStem',
        value: '계',
        interpretation: '일간을 반영했습니다.',
      },
    ],
  }
  return {
    result: {
      schemaVersion: '2',
      fiveElements: paragraph,
      annualOverview: { ...paragraph, content: '기준 연도의 총평입니다.' },
      personality: { ...paragraph, content: '성향 해석입니다.' },
      career: { ...paragraph, content: '커리어 해석입니다.' },
      wealth: { ...paragraph, content: '재물 해석입니다.' },
      relationship: { ...paragraph, content: '관계 해석입니다.' },
      currentLuck: { ...paragraph, content: '생성 당시 대운 해석입니다.' },
    },
    legacyResult: null,
    asOfDate: '2026-10-17',
  }
}
