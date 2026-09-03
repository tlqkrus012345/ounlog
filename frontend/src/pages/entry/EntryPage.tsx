import { useNavigate } from 'react-router-dom'
import './EntryPage.css'

function EntryPage() {
  const navigate = useNavigate()

  return (
    <main className="entry">
      <section className="entry__container">
        <header className="entry__header">
          <h1>오늘 무엇을 알고 싶나요?</h1>
          <p>지금 필요한 방식으로 가볍게 시작해보세요.</p>
        </header>

        <div className="entry__options">
          <button
            type="button"
            className="entry-card"
            onClick={() => navigate('/saju')}
          >
            <h2>사주</h2>
            <p>나의 성향과 긴 흐름을 알아봐요.</p>
          </button>

          <button
            type="button"
            className="entry-card"
            onClick={() => navigate('/tarot')}
          >
            <h2>타로</h2>
            <p>지금 고민의 방향을 가볍게 확인해요.</p>
          </button>
        </div>

        <footer className="entry__footer">
          <span className="entry__footer-text">이미 계정이 있으신가요?</span>
          <button
            type="button"
            className="entry__login-btn"
            onClick={() => navigate('/login')}
          >
            로그인하기
          </button>
        </footer>
      </section>
    </main>
  )
}

export default EntryPage
