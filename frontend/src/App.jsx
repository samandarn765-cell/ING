import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ExamCenter from './pages/ExamCenter'
import HomeworkDetail from './pages/HomeworkDetail'
import HomeworkList from './pages/HomeworkList'
import MockTestRunner from './pages/MockTestRunner'
import Planner from './pages/Planner'
import Reading from './pages/Reading'
import SettingsPage from './pages/Settings'
import Speaking from './pages/Speaking'
import Typing from './pages/Typing'
import Vocabulary from './pages/Vocabulary'
import WeakSpots from './pages/WeakSpots'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="homework" element={<HomeworkList />} />
        <Route path="homework/:id" element={<HomeworkDetail />} />
        <Route path="exam" element={<ExamCenter />} />
        <Route path="exam/:id" element={<MockTestRunner />} />
        <Route path="speaking" element={<Speaking />} />
        <Route path="vocabulary" element={<Vocabulary />} />
        <Route path="weak-spots" element={<WeakSpots />} />
        <Route path="typing" element={<Typing />} />
        <Route path="reading" element={<Reading />} />
        <Route path="planner" element={<Planner />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
