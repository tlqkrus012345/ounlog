import { useLocation, useNavigate } from 'react-router-dom'

type SajuFormState = {
  birthDate: string
  calendarType: 'SOLAR' | 'LUNAR'
  birthTime: string | null
  birthTimeKnown: boolean
}

function ConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const state = location.state as SajuFormState | null

  if (!state) {
    return <div>입력 정보가 없습니다.</div>
  }

  return (
    <main className="saju">
      <section className="saju__content">
        <header className="saju__top">
          <button
            type="button"
            className="saju__back"
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <span className="saju__step">3 / 3</span>
        </header>

        <div className="saju__header">
          <h1>입력한 정보가 맞나요?</h1>
          <p>분석을 시작하기 전에 한 번 확인해주세요.</p>
        </div>

        <div className="saju-confirm">
          <div className="saju-confirm__row">
            <span>생년월일</span>
            <strong>{state.birthDate}</strong>
          </div>

          <div className="saju-confirm__row">
            <span>달력 기준</span>
            <strong>{state.calendarType === 'SOLAR' ? '양력' : '음력'}</strong>
          </div>

          <div className="saju-confirm__row">
            <span>출생시간</span>
            <strong>{state.birthTimeKnown ? state.birthTime : '모름'}</strong>
          </div>
        </div>

        <button type="button" className="saju__next">
          분석 시작하기
        </button>
      </section>
    </main>
  )
}

export default ConfirmPage
