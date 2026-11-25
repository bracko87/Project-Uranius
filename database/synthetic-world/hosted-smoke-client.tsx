import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import LoginPage from '../../src/pages/Login'
import { getMyClubContext } from '../../src/lib/clubContext'
import { supabase, request } from './login-db-transport'
import { projectOriginalNineSkillsFromSyntheticRider } from '../reconstruction/squad/original-nine-skill-availability.mjs'

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

type ScheduleRow = {
  id: string
  title: string
  subtitle: string
  countryCode: string | null
  dateLabel?: string
  timeLabel?: string
  href?: string
}
type OverviewSchedule = {
  upcomingSchedule: ScheduleRow[]
  todayRaces: ScheduleRow[]
}

function isSchedule(value: unknown): value is OverviewSchedule {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<OverviewSchedule>
  return Array.isArray(data.upcomingSchedule) && Array.isArray(data.todayRaces) &&
    [...data.upcomingSchedule, ...data.todayRaces].every(row =>
      row && typeof row.id === 'string' && typeof row.title === 'string' &&
      typeof row.subtitle === 'string' &&
      (row.countryCode === null || typeof row.countryCode === 'string'))
}

function ScheduleStatus() {
  const [schedule, setSchedule] = useState<OverviewSchedule | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  useEffect(() => {
    let active = true
    void request('overview-schedule').then(value => {
      if (!active) return
      if (isSchedule(value)) {
        setSchedule(value)
        setStatus('ready')
      } else {
        setSchedule(null)
        setStatus('unavailable')
      }
    }).catch(() => {
      if (active) {
        setSchedule(null)
        setStatus('unavailable')
      }
    })
    return () => { active = false }
  }, [])
  const sections: { key: keyof OverviewSchedule; heading: string; empty: string }[] = [
    { key: 'upcomingSchedule', heading: 'Upcoming Schedule', empty: 'No upcoming race preparations are recorded for this club.' },
    { key: 'todayRaces', heading: "Today's Races", empty: 'No races are scheduled in the current game day.' },
  ]
  return <section className="mt-6 rounded-lg border border-slate-700 p-4" aria-live="polite">
    <h2 className="text-lg font-semibold">Race schedule</h2>
    {status === 'loading' && <p className="text-slate-300">Checking the authenticated race schedule…</p>}
    {status === 'unavailable' && <p className="text-amber-200">
      The authenticated race schedule is not connected. This is not a confirmed empty calendar.
    </p>}
    {status === 'ready' && schedule && <div className="mt-3 grid gap-6 md:grid-cols-2">
      {sections.map(section => <section key={section.key}>
        <h3 className="font-medium">{section.heading}</h3>
        {schedule[section.key].length === 0
          ? <p className="mt-2 text-slate-300">{section.empty}</p>
          : <ul className="mt-2 space-y-2">{schedule[section.key].map(row => <li
            key={row.id} className="rounded border border-slate-700 p-3">
            <p className="font-medium">{row.title}</p>
            <p className="text-sm text-slate-300">{row.subtitle}</p>
            <p className="text-xs text-slate-400">
              {[section.key === 'upcomingSchedule' ? row.dateLabel : row.timeLabel, row.countryCode]
                .filter(Boolean).join(' · ')}
            </p>
          </li>)}</ul>}
      </section>)}
    </div>}
  </section>
}

type SyntheticSquadRider = {
  syntheticRiderId: number
  syntheticRiderUuid?: string
  label: string
  flat: number
  climbing: number
  stamina: number
  resistance: number
}
type SyntheticSquadPacket = {
  kind: 'syntheticSquadPreview' | 'syntheticSquadUuidPreview'
  clubId: string
  riders: SyntheticSquadRider[]
  missingOriginalFields: string[]
}
const expectedSquadMissing = [
  'assigned_role','age_years','overall','availability_status','fatigue',
  'country_code','birth_date','morale','potential','contract'
]
function isSyntheticSquad(value: unknown, expectedClubId: string): value is SyntheticSquadPacket {
  if (!value || typeof value !== 'object') return false
  const packet = value as Partial<SyntheticSquadPacket>
  const fields = ['syntheticRiderId','label','flat','climbing','stamina','resistance']
  const ids = new Set<number>()
  const uuids = new Set<string>()
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
  const withUuid = packet.kind === 'syntheticSquadUuidPreview'
  return (packet.kind === 'syntheticSquadPreview' || withUuid) && packet.clubId === expectedClubId &&
    Array.isArray(packet.missingOriginalFields) &&
    packet.missingOriginalFields.join('|') === expectedSquadMissing.join('|') &&
    Array.isArray(packet.riders) && packet.riders.length <= 100 &&
    packet.riders.every(row => {
      if (!row || !Number.isSafeInteger(row.syntheticRiderId) || row.syntheticRiderId < 1 ||
          ids.has(row.syntheticRiderId) || typeof row.label !== 'string' || !row.label.trim() ||
          Object.keys(row).some(field => ![...fields,...(withUuid ? ['syntheticRiderUuid'] : [])].includes(field)) ||
          (withUuid && (typeof row.syntheticRiderUuid !== 'string' ||
            !uuid.test(row.syntheticRiderUuid) ||
            row.syntheticRiderUuid.toLowerCase() === '00000000-0000-0000-0000-000000000000' ||
            uuids.has(row.syntheticRiderUuid.toLowerCase()))) ||
          (!withUuid && row.syntheticRiderUuid !== undefined) ||
          !(['flat','climbing','stamina','resistance'] as const).every(skill =>
            Number.isInteger(row[skill]) && row[skill] >= 0 && row[skill] <= 100)) return false
      ids.add(row.syntheticRiderId)
      if (withUuid && row.syntheticRiderUuid) uuids.add(row.syntheticRiderUuid.toLowerCase())
      return true
    })
}
function SquadPreview() {
  const navigate = useNavigate()
  const [data,setData] = useState<SyntheticSquadPacket|null>(null)
  const [selectedRiderId,setSelectedRiderId] = useState<number|null>(null)
  const [state,setState] = useState<'loading'|'ready'|'unavailable'>('loading')
  useEffect(() => {
    let active = true
    void Promise.all([getMyClubContext(),request('squad-uuid').then(packet => packet ?? request('squad'))]).then(([club,packet]) => {
      if (!active) return
      const expected = club.mainClub?.id
      if (typeof expected === 'string' && isSyntheticSquad(packet,expected)) {
        setData(packet); setState('ready')
      } else { setData(null); setState('unavailable') }
    }).catch(() => { if(active){setData(null);setState('unavailable')} })
    return () => { active = false }
  },[])
  return <main className="min-h-screen bg-slate-950 text-white">
    <section className="mx-auto max-w-5xl rounded-xl bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Squad</h1>
          <p className="text-sm text-slate-300">Verified synthetic riders · read-only preview</p>
        </div>
        <button onClick={() => navigate('/dashboard/overview')} className="rounded border border-slate-600 px-3 py-2">Back to Overview</button>
      </div>
      <div aria-live="polite" className="mt-6" data-squad-state={state}>
        {state === 'loading' && <p>Checking your authenticated Squad roster…</p>}
        {state === 'unavailable' && <p className="text-amber-200">Squad data is unavailable or your club could not be verified. No fixture roster is displayed.</p>}
        {state === 'ready' && data && <>
          <p className="mb-3 text-slate-300" data-squad-count>{data.riders.length} riders in this club</p>
          <p className="mb-2 text-sm text-slate-400">Select a rider to inspect the currently available profile fields. No edits are possible.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-squad-table>
              <thead><tr className="border-b border-slate-600"><th className="p-2">Rider</th><th className="p-2">Flat</th><th className="p-2">Climbing</th><th className="p-2">Stamina</th><th className="p-2">Resistance</th></tr></thead>
              <tbody>{data.riders.map(r => <tr key={r.syntheticRiderId} className="border-b border-slate-800"><td className="p-2"><button type="button" className="text-left underline underline-offset-4 hover:text-cyan-200" onClick={() => setSelectedRiderId(r.syntheticRiderId)} data-select-rider={r.syntheticRiderId}>{r.label}</button></td><td className="p-2">{r.flat}</td><td className="p-2">{r.climbing}</td><td className="p-2">{r.stamina}</td><td className="p-2">{r.resistance}</td></tr>)}</tbody>
            </table>
          </div>
          {selectedRiderId !== null && (() => {
            const rider = data.riders.find(row => row.syntheticRiderId === selectedRiderId)
            if (!rider) return null
            return <section aria-label="Synthetic rider profile" data-rider-profile className="mt-5 rounded-lg border border-slate-600 bg-slate-950 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h2 className="text-lg font-semibold">{rider.label}</h2>
                  <p className="text-xs text-slate-400">Synthetic rider #{rider.syntheticRiderId} — not an original rider UUID</p>
                  {rider.syntheticRiderUuid && <p className="mt-1 break-all text-xs text-cyan-200" data-synthetic-rider-uuid>Uranius synthetic UUID: {rider.syntheticRiderUuid}</p>}</div>
                <button type="button" onClick={() => setSelectedRiderId(null)} className="rounded border border-slate-500 px-3 py-1">Close profile</button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['flat','climbing','stamina','resistance'] as const).map(skill => <div key={skill}>
                  <dt className="text-xs capitalize text-slate-400">{skill}</dt>
                  <dd className="text-lg font-semibold">{rider[skill]}</dd>
                </div>)}
              </dl>
              <section aria-label="Original nine-skill availability" data-original-nine-skills className="mt-4 border-t border-slate-700 pt-3">
                <h3 className="text-sm font-semibold">Original nine-skill model — available source values</h3>
                <p className="mt-1 text-xs text-slate-400">Climbing, Flat and Resistance are stored in the isolated catalog. Six other skills are unavailable, not zero. Synthetic Stamina is separate from original Endurance.</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {projectOriginalNineSkillsFromSyntheticRider(rider,{ownerVerified:true}).skills.map(skill => <div key={skill.name}>
                    <dt className="text-xs capitalize text-slate-400">{skill.name.replaceAll('_',' ')}</dt>
                    <dd className="font-medium" data-original-skill={skill.name}>{skill.value === null ? 'Unavailable' : skill.value}</dd>
                  </div>)}
                </dl>
              </section>
              <p className="mt-4 text-sm text-amber-200">Original rider identity, nationality, birth date, age, role, overall, fitness, morale, potential, health and contract details are not available in this synthetic database. No values have been inferred.</p>
              <p className="mt-2 text-xs text-slate-400">Read-only profile. No training, transfers, health actions or contract changes.</p>
            </section>
          })()}
          <p className="mt-4 text-xs text-slate-400">Original-game fields including role, age, overall, fatigue, availability and contracts are not yet reconstructed. Transfers, training and rider changes are disabled.</p>
        </>}
      </div>
    </section>
  </main>
}

type CalendarStage = {
  raceId: string; title: string; category: string; countryCode: string|null;
  raceStatus: string; stageNumber: number; stageDate: string; stageFormat: string|null;
  ownAccepted: boolean
}
type CalendarPacket = { clubId: string; gameDate: string; stages: CalendarStage[] }
function CalendarPreview() {
  const navigate=useNavigate()
  const [data,setData]=useState<CalendarPacket|null>(null)
  const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading')
  const [ownOnly,setOwnOnly]=useState(false)
  useEffect(()=>{
    let active=true
    void Promise.all([getMyClubContext(),request('calendar')]).then(([club,packet])=>{
      if(!active)return
      if(club.mainClub && packet && packet.clubId===club.mainClub.id &&
          typeof packet.gameDate==='string' && Array.isArray(packet.stages)) {
        setData(packet);setStatus('ready')
      } else {setData(null);setStatus('unavailable')}
    }).catch(()=>{if(active){setData(null);setStatus('unavailable')}})
    return ()=>{active=false}
  },[])
  const visible=data?.stages.filter(row=>!ownOnly||row.ownAccepted)??[]
  return <main className="min-h-screen bg-slate-950 text-white">
    <section className="mx-auto max-w-5xl rounded-xl bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-slate-300">Synthetic race world · read-only next 30 game days</p></div>
        <button onClick={()=>navigate('/dashboard/overview')} className="rounded border border-slate-600 px-3 py-2">Back to Overview</button>
      </div>
      <div aria-live="polite" className="mt-6" data-calendar-state={status}>
        {status==='loading'&&<p>Checking authenticated race calendar…</p>}
        {status==='unavailable'&&<p className="text-amber-200">Calendar unavailable or club not verified. No fixture fallback is shown.</p>}
        {status==='ready'&&data&&<>
          <p className="text-sm text-slate-300">Game date: {data.gameDate} · {data.stages.length} scheduled stage records</p>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={ownOnly} onChange={e=>setOwnOnly(e.target.checked)}/> Show only my accepted races</label>
          {visible.length===0?<p className="mt-3">No stages match this view.</p>:<div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm" data-calendar-table><thead><tr className="border-b border-slate-600">
              {['Date','Race','Stage','Format','Race status','My entry'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead>
              <tbody>{visible.map(row=><tr key={row.raceId+':'+row.stageNumber} className="border-b border-slate-800">
                <td className="p-2">{row.stageDate}</td><td className="p-2">{row.title}<div className="text-xs text-slate-400">{row.countryCode??'Country unavailable'} · {row.category}</div></td>
                <td className="p-2">{row.stageNumber}</td><td className="p-2">{row.stageFormat?.replaceAll('_',' ')??'Unavailable'}</td>
                <td className="p-2">{row.raceStatus}</td><td className="p-2">{row.ownAccepted?'Accepted':'No accepted entry'}</td>
              </tr>)}</tbody>
            </table>
          </div>}
          <p className="mt-4 text-xs text-slate-400">No applications, startlists or simulation controls are available. Other clubs’ private entry data is never shown.</p>
        </>}
      </div>
    </section>
  </main>
}

type ReplayGroup={id:string;type:string;km:number;speed:number;gap:number;count:number;active:boolean}
type ReplayFrame={second:number;km:number;groups:ReplayGroup[]}
type ReplayPacket={clubId:string;replay:null|{
 runId:string;raceId:string;stageId:string;title:string;kind:string;distanceKm:number;
 classification:{rank:number;rider:string;team:string;seconds:number}[];
 frames:ReplayFrame[];events:{sequence:number;second:number;km:number;type:string}[]
}}
function formatRaceTime(seconds:number) {
 const n=Math.floor(seconds)
 return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(v=>String(v).padStart(2,'0')).join(':')
}
function RaceReplayPreview() {
 const navigate=useNavigate()
 const [data,setData]=useState<ReplayPacket|null>(null)
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [index,setIndex]=useState(0)
 const [playing,setPlaying]=useState(false)
 const [speed,setSpeed]=useState(30)
 useEffect(()=>{
  let active=true
  void Promise.all([getMyClubContext(),request('race-replay')]).then(([club,packet])=>{
   if(!active)return
   if(club.mainClub&&packet&&packet.clubId===club.mainClub.id&&
      (packet.replay===null||(packet.replay?.kind==='syntheticRaceReplay'&&Array.isArray(packet.replay.frames)&&packet.replay.frames.length===347))){
    setData(packet);setStatus('ready')
   }else{setData(null);setStatus('unavailable')}
  }).catch(()=>{if(active){setData(null);setStatus('unavailable')}})
  return()=>{active=false}
 },[])
 const replay=data?.replay
 const frame=replay?.frames[index]
 const lastIndex=(replay?.frames.length??1)-1
 useEffect(()=>{
  if(!playing||!replay||index>=lastIndex){if(playing)setPlaying(false);return}
  const delay=(replay.frames[index+1].second-replay.frames[index].second)*1000/speed
  const timer=window.setTimeout(()=>setIndex(i=>Math.min(i+1,lastIndex)),Math.max(20,delay))
  return()=>window.clearTimeout(timer)
 },[playing,replay,index,lastIndex,speed])
 return <main className="min-h-screen bg-slate-950 text-white">
  <section className="mx-auto max-w-5xl rounded-xl bg-slate-900 p-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="text-2xl font-semibold">Race results and replay</h1>
    <p className="text-sm text-slate-300">Participant-only · synthetic test · read-only</p></div>
    <button onClick={()=>navigate('/dashboard/overview')} className="rounded border border-slate-600 px-3 py-2">Back to Overview</button>
   </div>
   <div aria-live="polite" className="mt-6" data-replay-state={status}>
    {status==='loading'&&<p>Loading authenticated race archive…</p>}
    {status==='unavailable'&&<p className="text-amber-200">Replay unavailable or your club could not be verified. No fixture fallback is shown.</p>}
    {status==='ready'&&!replay&&<p>No authorized synthetic race results are available for this club.</p>}
    {status==='ready'&&replay&&frame&&<>
     <h2 className="text-xl font-semibold">{replay.title}</h2>
     <p className="text-sm text-amber-200">This archived test does not count toward sporting results, points or prize money.</p>
     <section className="mt-5 rounded border border-slate-700 p-4">
      <h3 className="font-semibold">Recorded race replay</h3>
      <p className="mt-2 tabular-nums">{formatRaceTime(frame.second)} · {frame.km.toFixed(2)} / {replay.distanceKm} km · Frame {index+1} / {replay.frames.length}</p>
      <div className="mt-4 space-y-3">
       {frame.groups.map(g=><div key={g.id}>
        <p className="text-sm">{g.type} · {g.count} riders · {g.speed.toFixed(1)} km/h · Gap {g.gap.toFixed(1)} s{g.active?'':' · Finished/inactive'}</p>
        <div className="relative mt-2 h-3 rounded bg-slate-700"><span className="absolute h-3 w-3 rounded-full bg-cyan-300" style={{left:`calc(${100*g.km/replay.distanceKm}% - ${12*g.km/replay.distanceKm}px)`}}/></div>
       </div>)}
       <div className="flex justify-between text-xs text-slate-400"><span>Start · 0 km</span><span>Finish · {replay.distanceKm} km</span></div>
      </div>
      <label className="mt-4 block text-sm">Replay position<input className="block w-full" type="range" min={0} max={lastIndex} value={index} onChange={e=>{setPlaying(false);setIndex(Number(e.target.value))}}/></label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
       <button className="rounded border border-slate-600 px-3 py-2" onClick={()=>{setPlaying(false);setIndex(0)}}>Restart</button>
       <button className="rounded border border-slate-600 px-3 py-2" onClick={()=>{if(index===lastIndex)setIndex(0);setPlaying(p=>!p)}}>{playing?'Pause':'Play'}</button>
       <button className="rounded border border-slate-600 px-3 py-2" disabled={index===0} onClick={()=>{setPlaying(false);setIndex(i=>i-1)}}>Previous frame</button>
       <button className="rounded border border-slate-600 px-3 py-2" disabled={index===lastIndex} onClick={()=>{setPlaying(false);setIndex(i=>i+1)}}>Next frame</button>
       <label>Speed <select className="bg-slate-800" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[10,30,60,120].map(s=><option key={s} value={s}>{s}×</option>)}</select></label>
      </div>
      <p className="mt-3 text-xs text-slate-400">Positions are recorded frames, not interpolated live rider positions. No tactical controls.</p>
     </section>
     <section className="mt-6"><h3 className="font-semibold">Final classification</h3>
      <div className="overflow-x-auto"><table className="mt-2 w-full text-left text-sm"><thead><tr>{['Rank','Rider','Team','Time','Gap'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>
       {replay.classification.map(r=><tr key={r.rank} className="border-b border-slate-700"><td className="p-2">{r.rank}</td><td className="p-2">{r.rider}</td><td className="p-2">{r.team}</td><td className="p-2">{formatRaceTime(r.seconds)}</td><td className="p-2">+{formatRaceTime(Math.max(0,r.seconds-replay.classification[0].seconds))}</td></tr>)}
      </tbody></table></div>
     </section>
     <section className="mt-6"><h3 className="font-semibold">Recorded events ({replay.events.length})</h3>
      <ol className="mt-2 space-y-1 text-sm">{replay.events.filter(e=>e.second<=frame.second).map(e=><li key={e.sequence}>{formatRaceTime(e.second)} · {e.km.toFixed(2)} km · {e.type.replaceAll('_',' ')}</li>)}</ol>
     </section>
    </>}
   </div>
  </section>
 </main>
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
      {data && <ScheduleStatus />}
      {data && <button onClick={() => navigate('/dashboard/squad')} className="mt-4 mr-4 rounded border border-slate-600 px-3 py-2" data-open-squad>View Squad</button>}
      {data && <button onClick={()=>navigate('/dashboard/calendar')} className="mt-4 mr-4 rounded border border-slate-600 px-3 py-2" data-open-calendar>View Calendar</button>}
      {data && <button onClick={()=>navigate('/dashboard/race-replay')} className="mt-4 mr-4 rounded border border-slate-600 px-3 py-2" data-open-race-replay>Race Results & Replay</button>}
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
    <Route path="/dashboard/squad" element={<SquadPreview />} />
    <Route path="/dashboard/calendar" element={<CalendarPreview />} />
    <Route path="/dashboard/race-replay" element={<RaceReplayPreview />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
</HashRouter>)
