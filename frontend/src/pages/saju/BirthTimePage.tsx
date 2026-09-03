import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function BirthTimePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [birthTime, setBirthTime] = useState('')
  const [birthTimeKnown, setBirthTimeKnown] = useState(true)

  const previousState = location.state

  const canProceed = !birthTimeKnown || birthTime !== ''

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

          <span className="saju__step">2 / 3</span>
        </header>

        <div className="saju__header">
          <h1>몇 시에 태어나셨나요?</h1>
          <p>
            태어난 시간을 알면
            <br />더 정밀하게 분석할 수 있어요.
          </p>
        </div>

        <div className="saju__form">
          {birthTimeKnown && (
            <div className="saju__field">
              <label htmlFor="birthTime">출생시간</label>

              <input
                id="birthTime"
                type="time"
                value={birthTime}
                onChange={(event) => setBirthTime(event.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            className="saju__unknown-time"
            onClick={() => {
              setBirthTimeKnown(!birthTimeKnown)
              setBirthTime('')
            }}
          >
            {birthTimeKnown
              ? '태어난 시간을 모르겠어요'
              : '출생시간을 입력할게요'}
          </button>
        </div>

        <button
          type="button"
          className="saju__next"
          disabled={!canProceed}
          onClick={() =>
            navigate('/saju/confirm', {
              state: {
                ...previousState,
                birthTime: birthTimeKnown ? birthTime : null,
                birthTimeKnown,
              },
            })
          }
        >
          다음
        </button>
      </section>
    </main>
  )
}

export default BirthTimePage
