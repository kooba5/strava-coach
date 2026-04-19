export interface StreamsData {
  time: number[]
  distance: number[]
  velocity_smooth: number[]
  heartrate: number[]
  cadence: number[]
  altitude: number[]
}

export interface Split {
  index: number
  label: string
  distanceM: number
  durationSec: number
  paceStr: string
  hr: number | null
  cadence: number | null
  elevationGain: number
}

export interface SplitSummary {
  type: 'km' | 'minute'
  splits: Split[]
  intervalReps?: IntervalRep[]
}

export interface IntervalRep {
  rep: number
  distanceM: number
  durationSec: number
  paceStr: string
  avgHr: number | null
  avgCadence: number | null
  hitTarget: boolean | null
  targetPaceStr?: string
}

function secPerMtoStr(secPerM: number): string {
  const secPerKm = secPerM * 1000
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')}/km`
}

export async function fetchStreams(
  activityId: number,
  accessToken: string
): Promise<StreamsData | null> {
  const keys = 'time,distance,velocity_smooth,heartrate,cadence,altitude'
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${keys}&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()

  return {
    time: data.time?.data || [],
    distance: data.distance?.data || [],
    velocity_smooth: data.velocity_smooth?.data || [],
    heartrate: data.heartrate?.data || [],
    cadence: data.cadence?.data || [],
    altitude: data.altitude?.data || [],
  }
}

export function buildKmSplits(streams: StreamsData): Split[] {
  const { time, distance, velocity_smooth, heartrate, cadence, altitude } = streams
  if (!distance.length) return []

  const totalDistM = distance[distance.length - 1]
  const splits: Split[] = []
  let kmTarget = 1000
  let splitStart = 0 // index

  while (kmTarget <= totalDistM + 500) {
    // find index where distance crosses kmTarget
    let endIdx = distance.findIndex((d) => d >= Math.min(kmTarget, totalDistM))
    if (endIdx === -1) endIdx = distance.length - 1

    const durationSec = time[endIdx] - time[splitStart]
    const distM = distance[endIdx] - distance[splitStart]
    if (distM < 100 || durationSec < 10) break

    const avgVelocity =
      velocity_smooth.slice(splitStart, endIdx).reduce((a, b) => a + b, 0) /
      Math.max(1, endIdx - splitStart)
    const paceStr = avgVelocity > 0 ? secPerMtoStr(1 / avgVelocity) : '—'

    const hrSlice = heartrate.slice(splitStart, endIdx).filter((h) => h > 0)
    const avgHr = hrSlice.length
      ? Math.round(hrSlice.reduce((a, b) => a + b, 0) / hrSlice.length)
      : null

    const cadSlice = cadence.slice(splitStart, endIdx).filter((c) => c > 0)
    const avgCad = cadSlice.length
      ? Math.round((cadSlice.reduce((a, b) => a + b, 0) / cadSlice.length) * 2)
      : null

    const altSlice = altitude.slice(splitStart, endIdx)
    const elevGain = altSlice.reduce((gain, alt, i) => {
      if (i === 0) return gain
      const diff = alt - altSlice[i - 1]
      return gain + (diff > 0 ? diff : 0)
    }, 0)

    const kmNum = Math.floor(kmTarget / 1000)
    const isLast = kmTarget > totalDistM
    splits.push({
      index: kmNum,
      label: isLast ? `km ${kmNum - 1}–${(totalDistM / 1000).toFixed(1)}` : `km ${kmNum - 1}–${kmNum}`,
      distanceM: Math.round(distM),
      durationSec: Math.round(durationSec),
      paceStr,
      hr: avgHr,
      cadence: avgCad,
      elevationGain: Math.round(elevGain),
    })

    splitStart = endIdx
    if (endIdx >= distance.length - 1) break
    kmTarget += 1000
  }

  return splits
}

export function buildMinuteSplits(streams: StreamsData): Split[] {
  const { time, distance, velocity_smooth, heartrate, cadence, altitude } = streams
  if (!time.length) return []

  const totalSec = time[time.length - 1]
  const splits: Split[] = []
  const intervalSec = 60

  for (let minStart = 0; minStart < totalSec; minStart += intervalSec) {
    const minEnd = Math.min(minStart + intervalSec, totalSec)
    const startIdx = time.findIndex((t) => t >= minStart)
    const endIdx = time.findIndex((t) => t >= minEnd)
    const actualEnd = endIdx === -1 ? time.length - 1 : endIdx

    if (startIdx === -1 || actualEnd <= startIdx) break

    const distM = distance[actualEnd] - distance[startIdx]
    const durationSec = time[actualEnd] - time[startIdx]

    const avgVelocity =
      velocity_smooth.slice(startIdx, actualEnd).reduce((a, b) => a + b, 0) /
      Math.max(1, actualEnd - startIdx)
    const paceStr = avgVelocity > 0 ? secPerMtoStr(1 / avgVelocity) : '—'

    const hrSlice = heartrate.slice(startIdx, actualEnd).filter((h) => h > 0)
    const avgHr = hrSlice.length
      ? Math.round(hrSlice.reduce((a, b) => a + b, 0) / hrSlice.length)
      : null

    const cadSlice = cadence.slice(startIdx, actualEnd).filter((c) => c > 0)
    const avgCad = cadSlice.length
      ? Math.round((cadSlice.reduce((a, b) => a + b, 0) / cadSlice.length) * 2)
      : null

    const altSlice = altitude.slice(startIdx, actualEnd)
    const elevGain = altSlice.reduce((gain, alt, i) => {
      if (i === 0) return gain
      const diff = alt - altSlice[i - 1]
      return gain + (diff > 0 ? diff : 0)
    }, 0)

    const minNum = Math.floor(minStart / 60) + 1
    splits.push({
      index: minNum,
      label: `min ${minNum}`,
      distanceM: Math.round(distM),
      durationSec: Math.round(durationSec),
      paceStr,
      hr: avgHr,
      cadence: avgCad,
      elevationGain: Math.round(elevGain),
    })
  }

  return splits
}

// Detect interval reps by looking for alternating fast/slow sections
export function detectIntervalReps(
  streams: StreamsData,
  targetPaceStr?: string
): IntervalRep[] {
  const kmSplits = buildKmSplits(streams)
  if (kmSplits.length < 2) return []

  // Parse target pace to sec/km
  let targetSecPerKm: number | null = null
  if (targetPaceStr) {
    const match = targetPaceStr.match(/(\d+):(\d+)/)
    if (match) targetSecPerKm = parseInt(match[1]) * 60 + parseInt(match[2])
  }

  // Find fast km splits (pace < 5:00/km = 300 sec/km) as interval reps
  const fastSplits = kmSplits.filter((s) => {
    const parts = s.paceStr.replace('/km', '').split(':')
    if (parts.length !== 2) return false
    const sec = parseInt(parts[0]) * 60 + parseInt(parts[1])
    return sec < 300 // faster than 5:00/km
  })

  // Group consecutive fast splits into reps
  const reps: IntervalRep[] = []
  let repSplits: Split[] = []

  for (let i = 0; i < kmSplits.length; i++) {
    const split = kmSplits[i]
    const parts = split.paceStr.replace('/km', '').split(':')
    const secPerKm = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 999
    const isFast = secPerKm < 300

    if (isFast) {
      repSplits.push(split)
    } else if (repSplits.length > 0) {
      // End of a rep
      const totalDist = repSplits.reduce((s, r) => s + r.distanceM, 0)
      const totalTime = repSplits.reduce((s, r) => s + r.durationSec, 0)
      const avgVel = totalDist / totalTime
      const repPaceStr = secPerMtoStr(1 / avgVel)
      const repPaceParts = repPaceStr.replace('/km', '').split(':')
      const repSecPerKm = parseInt(repPaceParts[0]) * 60 + parseInt(repPaceParts[1])

      const hrVals = repSplits.filter((s) => s.hr).map((s) => s.hr as number)
      const avgHr = hrVals.length ? Math.round(hrVals.reduce((a, b) => a + b) / hrVals.length) : null

      const cadVals = repSplits.filter((s) => s.cadence).map((s) => s.cadence as number)
      const avgCad = cadVals.length ? Math.round(cadVals.reduce((a, b) => a + b) / cadVals.length) : null

      const hitTarget = targetSecPerKm
        ? repSecPerKm <= targetSecPerKm + 10 && repSecPerKm >= targetSecPerKm - 20
        : null

      reps.push({
        rep: reps.length + 1,
        distanceM: totalDist,
        durationSec: totalTime,
        paceStr: repPaceStr,
        avgHr,
        avgCadence: avgCad,
        hitTarget,
        targetPaceStr,
      })
      repSplits = []
    }
  }

  // Catch trailing rep
  if (repSplits.length > 0) {
    const totalDist = repSplits.reduce((s, r) => s + r.distanceM, 0)
    const totalTime = repSplits.reduce((s, r) => s + r.durationSec, 0)
    const avgVel = totalDist / totalTime
    const repPaceStr = secPerMtoStr(1 / avgVel)
    const repPaceParts = repPaceStr.replace('/km', '').split(':')
    const repSecPerKm = parseInt(repPaceParts[0]) * 60 + parseInt(repPaceParts[1])
    const hrVals = repSplits.filter((s) => s.hr).map((s) => s.hr as number)
    const avgHr = hrVals.length ? Math.round(hrVals.reduce((a, b) => a + b) / hrVals.length) : null
    const cadVals = repSplits.filter((s) => s.cadence).map((s) => s.cadence as number)
    const avgCad = cadVals.length ? Math.round(cadVals.reduce((a, b) => a + b) / cadVals.length) : null
    const hitTarget = targetSecPerKm ? repSecPerKm <= targetSecPerKm + 10 : null
    reps.push({
      rep: reps.length + 1,
      distanceM: totalDist,
      durationSec: totalTime,
      paceStr: repPaceStr,
      avgHr,
      avgCadence: avgCad,
      hitTarget,
      targetPaceStr,
    })
  }

  return reps
}

export function formatSplitsForPrompt(
  splits: Split[],
  type: 'km' | 'minute',
  reps?: IntervalRep[]
): string {
  let out = ''

  if (reps && reps.length > 0) {
    out += `INTERVAL REPS DETECTED (${reps.length} reps):\n`
    reps.forEach((r) => {
      out += `  Rep ${r.rep}: ${(r.distanceM / 1000).toFixed(2)}km | ${r.paceStr}`
      if (r.avgHr) out += ` | ${r.avgHr}bpm`
      if (r.avgCadence) out += ` | ${r.avgCadence}spm`
      if (r.hitTarget !== null) out += r.hitTarget ? ' ✅ hit target' : ' ❌ missed target'
      out += '\n'
    })
    out += '\n'
  }

  out += `${type === 'km' ? 'KM' : 'MINUTE'} SPLITS:\n`
  splits.forEach((s) => {
    out += `  ${s.label}: ${s.paceStr}`
    if (s.hr) out += ` | ${s.hr}bpm`
    if (s.cadence) out += ` | ${s.cadence}spm`
    if (s.elevationGain > 2) out += ` | +${s.elevationGain}m`
    out += '\n'
  })

  return out
}
