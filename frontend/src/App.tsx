import { Route, Routes } from 'react-router-dom'
import SplashPage from './pages/SplashPage'
import EntryPage from './pages/EntryPage'
import BirthDatePage from './pages/saju/BirthDatePage'
import BirthTimePage from './pages/saju/BirthTimePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/entry" element={<EntryPage />} />
      <Route path="/saju" element={<BirthDatePage />} />
      <Route path="/saju/birth-time" element={<BirthTimePage />} />
      <Route path="/saju/confirm" element={<ConfirmPage />} />
    </Routes>
  )
}

export default App
