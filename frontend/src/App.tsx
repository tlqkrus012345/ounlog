import { Route, Routes } from 'react-router-dom'
import SplashPage from './pages/SplashPage'
import EntryPage from './pages/EntryPage'
import SajuPage from './pages/SajuPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/entry" element={<EntryPage />} />
      <Route path="/saju" element={<SajuPage />} />
    </Routes>
  )
}

export default App
