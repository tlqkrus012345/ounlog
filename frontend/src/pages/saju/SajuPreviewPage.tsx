import { useLocation, useNavigate } from 'react-router-dom'
import type { SajuPreviewResponse } from '../../features/saju/types'
import './SajuPreviewPage.css'

function SajuPreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const result = location.state as SajuPreviewResponse | null

  if (!result) {
    return (
      <main className="preview">
        <section className="preview__content">
          <p>분석 결과를 찾을 수 없습니다.</p>

          <button
            type="button"
            className="saju__next"
            onClick={() => navigate('/saju')}
          >
            다시 분석하기
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="preview">
      <section className="preview__content">
        <p className="preview__eyebrow">올해 당신의 핵심 키워드는</p>

        <h1 className="preview__keyword">{result.keyword}</h1>

        <p className="preview__summary">{result.summary}</p>

        <div className="preview__locked">
          <h2>더 자세히 알고 싶다면</h2>

          <p>
            성향, 연애, 재물, 올해의 흐름까지 전체 사주 분석에서 확인할 수
            있어요.
          </p>
        </div>

        <button type="button" className="preview__next">
          전체 사주 분석 보기
        </button>
      </section>
    </main>
  )
}

export default SajuPreviewPage
