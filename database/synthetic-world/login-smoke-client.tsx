import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CharacterData, getFixtureDashboard, supabase } from './login-smoke-supabase'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import LoginPage from '../../src/pages/Login'
import { getMyClubContext } from '../../src/lib/clubContext'

function ClubDashboard() {
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const data = getFixtureDashboard(fixture.club.teamId)
  useEffect(() => { void getMyClubContext().then(club => setName(club.mainClub?.name ?? '')) }, [])
  return <main className="min-h-screen bg-slate-950 text-white">
    <section className="mx-auto max-w-5xl rounded-xl bg-slate-900 p-6">
      <h1 data-club>{name}</h1>
      <p data-riders>{data?.riders}</p>
      <p data-balance>{data?.credits}</p>
      <p data-calendar>{data?.calendar}</p>
      <button data-sign-out onClick={async () => {
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
      }}>Sign out</button>
    </section>
  </main>
}

const root = createRoot(document.getElementById('root')!)
const manager = new URLSearchParams(location.search).get('manager') === 'b' ? 'b' : 'a'
const fixture = CharacterData[manager]
root.render(<MemoryRouter initialEntries={['/login']}>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard/overview" element={<ClubDashboard />} />
  </Routes>
</MemoryRouter>)

async function waitFor<T>(check: () => T) {
  for (let step = 0; step < 100; step++) {
    const value = check()
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error('Expected browser state was not rendered')
}

async function smoke() {
  if (getFixtureDashboard(fixture.club.teamId) !== null) throw new Error('Anonymous dashboard access')
  const form = await waitFor(() => document.querySelector('form'))
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  for (const [name, value] of [['email', fixture.email], ['password', 'offline-fixture-only']]) {
    const input = form.querySelector<HTMLInputElement>('[name=' + name + ']')!
    set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  form.requestSubmit()
  await waitFor(() => document.querySelector('[data-club]')?.textContent === fixture.name)
  if (document.querySelector('[data-riders]')?.textContent !== '10' ||
      document.querySelector('[data-balance]')?.textContent !== '10000' ||
      document.querySelector('[data-calendar]')?.textContent !== '3' ||
      getFixtureDashboard(manager === 'a' ? 2 : 1) !== null) throw new Error('Invalid dashboard scope')
  document.querySelector<HTMLButtonElement>('[data-sign-out]')!.click()
  await waitFor(() => document.querySelector('form'))
  if (getFixtureDashboard(fixture.club.teamId) !== null || document.querySelector('[data-club]')) throw new Error('Stale dashboard after logout')
  document.body.dataset.smoke = 'passed-' + manager
}

void smoke().catch(() => { document.body.dataset.smoke = 'failed' })
