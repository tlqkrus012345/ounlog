import { Navigate, useLocation } from 'react-router-dom'
import type { SajuAnalysisCreationResult } from '../../features/saju/types'
import './SajuAnalysisPage.css'

const SECTIONS = [
  ['fiveElements', '오행 분석'],
  ['annualOverview', '올해 사주 총평'],
  ['personality', '성향 해석'],
  ['career', '커리어 해석'],
  ['wealth', '재물 해석'],
  ['relationship', '관계 해석'],
  ['currentLuck', '현재 대운 해석'],
] as const

function SajuAnalysisPage() {
  const location = useLocation()
  const analysis = location.state as SajuAnalysisCreationResult | null

  if (!analysis) {
    return <Navigate to="/saju" replace />
  }

  return (
    <main className="analysis">
      <section className="analysis__content">
        <p className="analysis__eyebrow">사주 분석이 완료되었습니다.</p>
        <h1>전체 사주 분석</h1>

        {analysis.asOfDate && (
          <p className="analysis__reference-date">
            해석 기준일:{' '}
            <time dateTime={analysis.asOfDate}>{analysis.asOfDate}</time>
            {' · '}올해와 현재 대운은 생성 당시 기준입니다.
          </p>
        )}

        {analysis.status === 'EXISTING' && (
          <p className="analysis__notice" role="status">
            이미 분석이 완료된 결과가 있습니다.
          </p>
        )}

        <div className="analysis__result">
          {analysis.result ? (
            SECTIONS.map(([key, title]) => (
              <section className="analysis__paragraph" key={key}>
                <h2>{title}</h2>
                <p>{analysis.result[key].content}</p>
              </section>
            ))
          ) : (
            <>
              <p className="analysis__legacy-notice">
                이전 형식의 분석 결과입니다. 해석 기준일 정보가 없습니다.
              </p>
              <p>{analysis.legacyResult}</p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default SajuAnalysisPage
