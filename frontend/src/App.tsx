import { Route, Routes } from 'react-router-dom'
import SplashPage from './pages/SplashPage'
import EntryPage from './pages/EntryPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/entry" element={<EntryPage />} />
    </Routes>
  )
}

export default App
