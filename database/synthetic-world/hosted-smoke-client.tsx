import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import LoginPage from '../../src/pages/Login'
import { getMyClubContext } from '../../src/lib/clubContext'
import { supabase, request } from './login-db-transport'

type GameClock = {
  current_game_date: string
  season_number: number
  month_number: number
  day_number: number
  is_paused: boolean
}

function ClockStatus() {
  const [clock, setClock] = useState<GameClock | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  useEffect(() => {
    let active = true
    void request('clock').then(value => {
      if (!active) return
      if (value && typeof value.current_game_date === 'string' &&
          Number.isInteger(value.season_number) &&
          typeof value.is_paused === 'boolean') {
        setClock(value)
        setStatus('ready')
      } else {
        setClock(null)
        setStatus('unavailable')
      }
    }).catch(() => {
      if (active) {
        setClock(null)
        setStatus('unavailable')
      }
    })
    return () => { active = false }
  }, [])
  return <section className="mt-6 rounded-lg border border-slate-700 p-4" aria-live="polite">
    <h2 className="text-lg font-semibold">Game clock</h2>
    {status === 'loading' && <p className="text-slate-300">Checking authenticated game clock…</p>}
    {status === 'unavailable' && <p className="text-amber-200">Clock data is not connected to this sandbox interface yet. Race-calendar entries remain test fixtures.</p>}
    {status === 'ready' && clock && <dl>
      <dt>Game date</dt><dd>{clock.current_game_date}</dd>
      <dt>Season</dt><dd>{clock.season_number}</dd>
      <dt>Status</dt><dd>{clock.is_paused ? 'Paused' : 'Running'}</dd>
    </dl>}
  </section>
}

function ClubDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<{ name: string; riders: number; credits: number; calendar: number }>()
  useEffect(() => {
    let active = true
    void Promise.all([getMyClubContext(), request('dashboard')]).then(([club, snapshot]) => {
      if (!active) return
      if (!club.mainClub || !snapshot) navigate('/login', { replace: true })
      else setData({ ...snapshot, name: club.mainClub.name })
    }).catch(() => { if (active) navigate('/login', { replace: true }) })
    return () => { active = false }
  }, [navigate])

  return <main className="min-h-screen bg-slate-950 text-white">
    <section className="mx-auto max-w-5xl rounded-xl bg-slate-900 p-6">
      <h1>{data?.name ?? 'Loading club'}</h1>
      {data && <dl>
        <dt>Squad</dt><dd>{data.riders} riders</dd>
        <dt>Opening balance</dt><dd>{data.credits.toLocaleString()} credits</dd>
        <dt>Calendar</dt><dd>{data.calendar} shared entries</dd>
      </dl>}
      {data && <ClockStatus />} 
      <button onClick={async () => {
        try { await supabase.auth.signOut() }
        catch { window.alert('The local session is closed. Uranius Auth sign-out could not be confirmed.') }
        finally { setData(undefined); navigate('/login', { replace: true }) }
      }}>Sign out</button>
    </section>
  </main>
}

createRoot(document.getElementById('root')!).render(<HashRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard/overview" element={<ClubDashboard />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
</HashRouter>)
