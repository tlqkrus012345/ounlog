import { Navigate, useLocation } from 'react-router-dom'
import type { SajuAnalysisCreationResult } from '../../features/saju/types'
import './SajuAnalysisPage.css'

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

        {analysis.status === 'EXISTING' && (
          <p className="analysis__notice" role="status">
            이미 분석이 완료된 결과가 있습니다.
          </p>
        )}

        <div className="analysis__result">
          <p>{analysis.result}</p>
        </div>
      </section>
    </main>
  )
}

export default SajuAnalysisPage
