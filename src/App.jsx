import { useEffect, useMemo, useRef, useState } from 'react'
import pollasaLogo from '../LOGO.png'
import {
  createLeagueRemote,
  deleteLeagueRemote,
  ensureRemoteProfile,
  fetchRemoteSnapshot,
  isSupabaseConfigured,
  leaveLeagueRemote,
  removeLeagueMemberRemote,
  requestJoinLeagueRemote,
  saveLeagueEntryRemote,
  signInRemote,
  signOutRemote,
  signUpRemote,
  supabase,
  updateJoinRequestRemote,
  updateLeagueBonusOverridesRemote,
  updateLeagueScoringRemote,
} from './lib/supabase'
import './App.css'

const STORAGE_KEY = 'pollasa-state-v5'
const EDIT_LOCK_MS = 2 * 60 * 1000

const appTabs = [
  { id: 'home', label: 'Inicio' },
  { id: 'matches', label: 'Partidos' },
  { id: 'table', label: 'Tabla' },
  { id: 'history', label: 'Historial' },
  { id: 'settings', label: 'Ajustes' },
]

const competitionOptions = [
  { id: 'world-cup', name: 'Mundial de Futbol', short: 'Mundial' },
  { id: 'champions', name: 'Champions League', short: 'Champions' },
  { id: 'libertadores', name: 'Copa Libertadores', short: 'Libertadores' },
  {
    id: 'ecuador-serie-a',
    name: 'Campeonato Ecuatoriano Serie A',
    short: 'Serie A Ecuador',
  },
]

const stageDefinitions = [
  { id: 'league', label: 'Liga regular' },
  { id: 'group', label: 'Fase de grupos' },
  { id: 'round_of_16', label: 'Octavos' },
  { id: 'quarterfinal', label: 'Cuartos' },
  { id: 'semifinal', label: 'Semifinal' },
  { id: 'final', label: 'Final' },
]

const bonusFields = [
  { id: 'champion', label: 'Campeon' },
  { id: 'runnerUp', label: 'Vicecampeon' },
  { id: 'third', label: 'Tercer lugar' },
  { id: 'fourth', label: 'Cuarto lugar' },
  { id: 'topScorer', label: 'Maximo goleador' },
]

const featuredPools = [
  {
    id: 'world-cup',
    title: 'Mundial de Futbol',
    players: 248,
    prize: '$2,400',
    accent: 'gold',
    status: 'Calendario confirmado',
  },
  {
    id: 'champions',
    title: 'Champions League',
    players: 132,
    prize: '$1,200',
    accent: 'teal',
    status: 'Octavos completados',
  },
  {
    id: 'libertadores',
    title: 'Copa Libertadores',
    players: 91,
    prize: '$850',
    accent: 'coral',
    status: 'Fase 3 abierta',
  },
  {
    id: 'ecuador-serie-a',
    title: 'Campeonato Ecuatoriano Serie A',
    players: 63,
    prize: '$320',
    accent: 'teal',
    status: 'Fecha en curso',
  },
]

const fallbackFixturesByCompetition = {
  champions: {
    source: 'UEFA',
    updatedAt: '23 marzo 2026',
    note: 'Resultados oficiales recientes y calendario confirmado de UEFA Champions League 2025/26.',
    competitionResults: {
      champion: '',
      runnerUp: '',
      third: '',
      fourth: '',
      topScorer: '',
    },
    matches: [
      {
        id: 1,
        stageKey: 'round_of_16',
        round: 'Octavos · vuelta',
        home: 'Arsenal',
        away: 'Leverkusen',
        kickoff: '17 mar 2026 · 21:00 CET',
        startsAt: '2026-03-17T21:00:00+01:00',
        venue: 'UEFA Champions League',
        details: 'Resultado oficial UEFA',
        status: 'completed',
        result: { home: 2, away: 0 },
      },
      {
        id: 2,
        stageKey: 'round_of_16',
        round: 'Octavos · vuelta',
        home: 'Chelsea',
        away: 'Paris Saint-Germain',
        kickoff: '17 mar 2026 · 21:00 CET',
        startsAt: '2026-03-17T21:00:00+01:00',
        venue: 'UEFA Champions League',
        details: 'Resultado oficial UEFA',
        status: 'completed',
        result: { home: 0, away: 3 },
      },
      {
        id: 3,
        stageKey: 'round_of_16',
        round: 'Octavos · vuelta',
        home: 'Manchester City',
        away: 'Real Madrid',
        kickoff: '17 mar 2026 · 21:00 CET',
        startsAt: '2026-03-17T21:00:00+01:00',
        venue: 'UEFA Champions League',
        details: 'Resultado oficial UEFA',
        status: 'completed',
        result: { home: 1, away: 2 },
      },
      {
        id: 4,
        stageKey: 'round_of_16',
        round: 'Octavos · vuelta',
        home: 'Barcelona',
        away: 'Newcastle',
        kickoff: '18 mar 2026 · 21:00 CET',
        startsAt: '2026-03-18T21:00:00+01:00',
        venue: 'UEFA Champions League',
        details: 'Resultado oficial UEFA',
        status: 'completed',
        result: { home: 7, away: 2 },
      },
      {
        id: 5,
        stageKey: 'quarterfinal',
        round: 'Cuartos · ida',
        home: 'Sporting CP',
        away: 'Arsenal',
        kickoff: '7 abr 2026 · 21:00 CET',
        startsAt: '2026-04-07T21:00:00+02:00',
        venue: 'UEFA Champions League',
        details: 'Llave oficial UEFA',
        status: 'scheduled',
      },
    ],
  },
  libertadores: {
    source: 'CONMEBOL',
    updatedAt: '23 marzo 2026',
    note: 'Programa oficial de partidos de fases preliminares publicado por CONMEBOL.',
    competitionResults: {
      champion: '',
      runnerUp: '',
      third: '',
      fourth: '',
      topScorer: '',
    },
    matches: [
      {
        id: 1,
        stageKey: 'round_of_16',
        round: 'Fase 3 · ida',
        home: 'Barcelona',
        away: 'Botafogo',
        kickoff: '3 mar 2026 · 19:30 local',
        startsAt: '2026-03-03T19:30:00-05:00',
        venue: 'Monumental Banco Pichincha, Guayaquil',
        details: 'CONMEBOL Libertadores 2026',
        status: 'completed',
        result: { home: 1, away: 1 },
      },
      {
        id: 2,
        stageKey: 'round_of_16',
        round: 'Fase 3 · vuelta',
        home: 'Botafogo',
        away: 'Barcelona',
        kickoff: '10 mar 2026 · 21:30 local',
        startsAt: '2026-03-10T21:30:00-03:00',
        venue: 'Nilton Santos, Rio de Janeiro',
        details: 'CONMEBOL Libertadores 2026',
        status: 'scheduled',
      },
      {
        id: 3,
        stageKey: 'group',
        round: 'Fase de grupos',
        home: 'LDU Quito',
        away: 'River Plate',
        kickoff: '26 mar 2026 · 19:00 local',
        startsAt: '2026-03-26T19:00:00-05:00',
        venue: 'Casa Blanca, Quito',
        details: 'Simulacion de apertura de grupos',
        status: 'scheduled',
      },
    ],
  },
  'ecuador-serie-a': {
    source: 'ESPN / LigaPro',
    updatedAt: '23 marzo 2026',
    note: 'Partidos recientes y hasta las 3 siguientes fechas tomados del calendario de LigaPro Ecuador.',
    competitionResults: {
      champion: '',
      runnerUp: '',
      third: '',
      fourth: '',
      topScorer: '',
    },
    matches: [
      {
        id: 1,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'Guayaquil City FC',
        away: 'Leones',
        kickoff: '23 mar 2026 · 17:30',
        startsAt: '2026-03-23T17:30:00-05:00',
        venue: 'Christian Benitez, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 2,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'Aucas',
        away: 'Orense',
        kickoff: '23 mar 2026 · 20:00',
        startsAt: '2026-03-23T20:00:00-05:00',
        venue: 'Gonzalo Pozo Ripalda, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 3,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'Mushuc Runa',
        away: 'Emelec',
        kickoff: '22 mar 2026 · 19:15',
        startsAt: '2026-03-22T19:15:00-05:00',
        venue: 'LigaPro Ecuador',
        details: 'Fixture de Emelec en ESPN',
        status: 'completed',
        result: { home: 1, away: 0 },
      },
      {
        id: 4,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'Liga de Quito',
        away: 'Manta F.C.',
        kickoff: '22 mar 2026 · 20:00',
        startsAt: '2026-03-22T20:00:00-05:00',
        venue: 'LigaPro Ecuador',
        details: 'Fixture de Liga de Quito en ESPN',
        status: 'completed',
        result: { home: 2, away: 1 },
      },
      {
        id: 17,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'Barcelona SC',
        away: 'Deportivo Cuenca',
        kickoff: '22 mar 2026 · 16:00',
        startsAt: '2026-03-22T16:00:00-05:00',
        venue: 'Monumental Banco Pichincha, Guayaquil',
        details: 'Calendario LigaPro Ecuador',
        status: 'completed',
        result: { home: 3, away: 1 },
      },
      {
        id: 18,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'Independiente del Valle',
        away: 'Libertad',
        kickoff: '22 mar 2026 · 18:00',
        startsAt: '2026-03-22T18:00:00-05:00',
        venue: 'Banco Guayaquil, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'completed',
        result: { home: 2, away: 0 },
      },
      {
        id: 19,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'El Nacional',
        away: 'Universidad Catolica',
        kickoff: '23 mar 2026 · 15:00',
        startsAt: '2026-03-23T15:00:00-05:00',
        venue: 'Olimpico Atahualpa, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 20,
        stageKey: 'league',
        round: 'Fecha 6',
        home: 'Delfin',
        away: 'Tecnico Universitario',
        kickoff: '23 mar 2026 · 19:00',
        startsAt: '2026-03-23T19:00:00-05:00',
        venue: 'Jocay, Manta',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 5,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Barcelona SC',
        away: 'Delfin',
        kickoff: '29 mar 2026 · 18:00',
        startsAt: '2026-03-29T18:00:00-05:00',
        venue: 'Monumental Banco Pichincha, Guayaquil',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 6,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Independiente del Valle',
        away: 'El Nacional',
        kickoff: '29 mar 2026 · 20:30',
        startsAt: '2026-03-29T20:30:00-05:00',
        venue: 'Banco Guayaquil, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 11,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Deportivo Cuenca',
        away: 'Mushuc Runa',
        kickoff: '30 mar 2026 · 19:00',
        startsAt: '2026-03-30T19:00:00-05:00',
        venue: 'Alejandro Serrano Aguilar, Cuenca',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 12,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Libertad',
        away: 'Universidad Catolica',
        kickoff: '30 mar 2026 · 21:15',
        startsAt: '2026-03-30T21:15:00-05:00',
        venue: 'Reina del Cisne, Loja',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 21,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Orense',
        away: 'Tecnico Universitario',
        kickoff: '29 mar 2026 · 15:30',
        startsAt: '2026-03-29T15:30:00-05:00',
        venue: '9 de Mayo, Machala',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 22,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Liga de Quito',
        away: 'Manta F.C.',
        kickoff: '30 mar 2026 · 16:30',
        startsAt: '2026-03-30T16:30:00-05:00',
        venue: 'Rodrigo Paz Delgado, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 23,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Leones',
        away: 'Guayaquil City FC',
        kickoff: '31 mar 2026 · 18:30',
        startsAt: '2026-03-31T18:30:00-05:00',
        venue: '7 de Octubre, Quevedo',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 24,
        stageKey: 'league',
        round: 'Fecha 7',
        home: 'Universidad Catolica',
        away: 'Emelec',
        kickoff: '31 mar 2026 · 20:45',
        startsAt: '2026-03-31T20:45:00-05:00',
        venue: 'Atahualpa, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 7,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'Emelec',
        away: 'Aucas',
        kickoff: '5 abr 2026 · 16:30',
        startsAt: '2026-04-05T16:30:00-05:00',
        venue: 'George Capwell, Guayaquil',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 8,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'Orense',
        away: 'Liga de Quito',
        kickoff: '5 abr 2026 · 19:00',
        startsAt: '2026-04-05T19:00:00-05:00',
        venue: '9 de Mayo, Machala',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 13,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'El Nacional',
        away: 'Barcelona SC',
        kickoff: '6 abr 2026 · 18:00',
        startsAt: '2026-04-06T18:00:00-05:00',
        venue: 'Olimpico Atahualpa, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 14,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'Delfin',
        away: 'Independiente del Valle',
        kickoff: '6 abr 2026 · 20:30',
        startsAt: '2026-04-06T20:30:00-05:00',
        venue: 'Jocay, Manta',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 25,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'Tecnico Universitario',
        away: 'Libertad',
        kickoff: '5 abr 2026 · 14:00',
        startsAt: '2026-04-05T14:00:00-05:00',
        venue: 'Bellavista, Ambato',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 26,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'Manta F.C.',
        away: 'Deportivo Cuenca',
        kickoff: '5 abr 2026 · 18:15',
        startsAt: '2026-04-05T18:15:00-05:00',
        venue: 'Jocay, Manta',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 27,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'Leones',
        away: 'Orense',
        kickoff: '6 abr 2026 · 16:00',
        startsAt: '2026-04-06T16:00:00-05:00',
        venue: '7 de Octubre, Quevedo',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 28,
        stageKey: 'league',
        round: 'Fecha 8',
        home: 'Universidad Catolica',
        away: 'Guayaquil City FC',
        kickoff: '6 abr 2026 · 21:00',
        startsAt: '2026-04-06T21:00:00-05:00',
        venue: 'Atahualpa, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 9,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'Liga de Quito',
        away: 'Barcelona SC',
        kickoff: '12 abr 2026 · 18:30',
        startsAt: '2026-04-12T18:30:00-05:00',
        venue: 'Rodrigo Paz Delgado, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 10,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'Delfin',
        away: 'Emelec',
        kickoff: '12 abr 2026 · 15:00',
        startsAt: '2026-04-12T15:00:00-05:00',
        venue: 'Jocay, Manta',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 15,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'Universidad Catolica',
        away: 'Aucas',
        kickoff: '13 abr 2026 · 19:00',
        startsAt: '2026-04-13T19:00:00-05:00',
        venue: 'Olimpico Atahualpa, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 16,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'Mushuc Runa',
        away: 'Orense',
        kickoff: '13 abr 2026 · 21:15',
        startsAt: '2026-04-13T21:15:00-05:00',
        venue: 'Echaleche, Ambato',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 29,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'Independiente del Valle',
        away: 'Leones',
        kickoff: '12 abr 2026 · 13:00',
        startsAt: '2026-04-12T13:00:00-05:00',
        venue: 'Banco Guayaquil, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 30,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'Libertad',
        away: 'Delfin',
        kickoff: '12 abr 2026 · 17:00',
        startsAt: '2026-04-12T17:00:00-05:00',
        venue: 'Reina del Cisne, Loja',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 31,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'El Nacional',
        away: 'Deportivo Cuenca',
        kickoff: '13 abr 2026 · 16:30',
        startsAt: '2026-04-13T16:30:00-05:00',
        venue: 'Atahualpa, Quito',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
      {
        id: 32,
        stageKey: 'league',
        round: 'Fecha 9',
        home: 'Manta F.C.',
        away: 'Tecnico Universitario',
        kickoff: '13 abr 2026 · 20:00',
        startsAt: '2026-04-13T20:00:00-05:00',
        venue: 'Jocay, Manta',
        details: 'Calendario LigaPro Ecuador',
        status: 'scheduled',
      },
    ],
  },
  'world-cup': {
    source: 'FIFA',
    updatedAt: '23 marzo 2026',
    note: 'Datos oficiales del calendario del Mundial 2026 publicado por FIFA.',
    competitionResults: {
      champion: '',
      runnerUp: '',
      third: '',
      fourth: '',
      topScorer: '',
    },
    matches: [
      {
        id: 1,
        stageKey: 'group',
        round: 'Grupo A',
        home: 'Mexico',
        away: 'Sudafrica',
        kickoff: '11 jun 2026 · 13:00 local',
        startsAt: '2026-06-11T13:00:00-06:00',
        venue: 'Mexico City Stadium',
        details: 'Partido inaugural',
        status: 'scheduled',
      },
      {
        id: 2,
        stageKey: 'group',
        round: 'Grupo B',
        home: 'Canada',
        away: 'Paraguay',
        kickoff: '12 jun 2026 · horario por confirmar',
        startsAt: '2026-06-12T19:00:00-04:00',
        venue: 'Toronto Stadium',
        details: 'Debut del anfitrion Canada',
        status: 'scheduled',
      },
    ],
  },
}

const seedUsers = [
  { id: 'seed-user', name: 'Carlos', email: 'carlos@pollasa.app', password: '123456' },
  { id: 'seed-user-2', name: 'Majo', email: 'majo@pollasa.app', password: '123456' },
  { id: 'seed-user-3', name: 'Nico', email: 'nico@pollasa.app', password: '123456' },
]

function buildDefaultScoring() {
  return {
    matchPoints: {
      outcome: 3,
      goalDiff: 5,
      exact: 8,
    },
    stagePoints: {
      league: 0,
      group: 0,
      round_of_16: 1,
      quarterfinal: 2,
      semifinal: 3,
      final: 5,
    },
    bonusPoints: {
      champion: 15,
      runnerUp: 10,
      third: 7,
      fourth: 5,
      topScorer: 6,
    },
  }
}

function buildBonusEditOverrides() {
  return {}
}

function defaultBonusPicks() {
  return {
    champion: '',
    runnerUp: '',
    third: '',
    fourth: '',
    topScorer: '',
  }
}

function buildEntry(competitionId) {
  const fixturePack =
    fallbackFixturesByCompetition[competitionId] || fallbackFixturesByCompetition.champions

  return {
    predictions: {},
    bonusPicks: defaultBonusPicks(),
  }
}

const starterLeagues = [
  {
    id: 'starter-1',
    name: 'POLLASA Champions',
    code: 'CHAMP8',
    inviteCode: 'UCL888',
    type: 'Publica',
    competition: 'Champions League',
    competitionId: 'champions',
    entry: '$10',
    prize: '$500',
    ownerId: 'seed-user',
    members: ['seed-user', 'seed-user-2', 'seed-user-3'],
    joinRequests: [],
    scoring: buildDefaultScoring(),
    bonusEditOverrides: buildBonusEditOverrides(),
    deadline: '18 mar · 21:00 CET',
  },
]

const starterEntries = {
  'starter-1': {
    'seed-user': {
      predictions: {
        1: { home: 2, away: 0 },
        2: { home: 0, away: 2 },
        3: { home: 1, away: 2 },
        4: { home: 5, away: 1 },
        5: { home: 1, away: 0 },
      },
      bonusPicks: {
        champion: 'Real Madrid',
        runnerUp: 'Paris Saint-Germain',
        third: 'Barcelona',
        fourth: 'Arsenal',
        topScorer: 'Kylian Mbappe',
      },
    },
    'seed-user-2': {
      predictions: {
        1: { home: 1, away: 0 },
        2: { home: 0, away: 3 },
        3: { home: 1, away: 1 },
        4: { home: 4, away: 2 },
        5: { home: 2, away: 1 },
      },
      bonusPicks: {
        champion: 'Barcelona',
        runnerUp: 'Real Madrid',
        third: 'Arsenal',
        fourth: 'Paris Saint-Germain',
        topScorer: 'Robert Lewandowski',
      },
    },
    'seed-user-3': {
      predictions: {
        1: { home: 0, away: 1 },
        2: { home: 1, away: 2 },
        3: { home: 0, away: 2 },
        4: { home: 2, away: 2 },
        5: { home: 1, away: 1 },
      },
      bonusPicks: {
        champion: 'Paris Saint-Germain',
        runnerUp: 'Liverpool',
        third: 'Real Madrid',
        fourth: 'Barcelona',
        topScorer: 'Mohamed Salah',
      },
    },
  },
}

const initialLeagueForm = {
  leagueName: '',
  privacy: 'Privada',
  competitionId: 'champions',
  entry: '$5',
  prize: 'Pozo comun',
}

const initialAuthForm = {
  name: '',
  email: '',
  password: '',
}

function TabIcon({ tabId, active }) {
  const commonProps = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: active ? 'tab-icon-svg active' : 'tab-icon-svg',
    'aria-hidden': 'true',
  }

  if (tabId === 'home') {
    return (
      <svg {...commonProps}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5V19h11v-8.5" />
        <path d="M10 19v-4.5h4V19" />
      </svg>
    )
  }

  if (tabId === 'matches') {
    return (
      <svg {...commonProps}>
        <rect x="4.5" y="5" width="15" height="14" rx="3" />
        <path d="M8 9.5h8" />
        <path d="M8 14.5h3" />
        <path d="M13.5 14.5h2.5" />
      </svg>
    )
  }

  if (tabId === 'table') {
    return (
      <svg {...commonProps}>
        <path d="M5 18V9" />
        <path d="M12 18V6" />
        <path d="M19 18v-4" />
        <path d="M3.5 18.5h17" />
      </svg>
    )
  }

  if (tabId === 'history') {
    return (
      <svg {...commonProps}>
        <path d="M12 7.5v5l3 1.8" />
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 4.5V9h-4.5" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 19a5.5 5.5 0 0 1 11 0" />
    </svg>
  )
}

function buildFallbackState() {
  return {
    currentUserId: '',
    currentTab: 'home',
    leagues: starterLeagues,
    leagueEntries: starterEntries,
    selectedLeagueId: 'starter-1',
    users: seedUsers,
  }
}

function loadState() {
  const fallback = buildFallbackState()

  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw)

    return {
      currentUserId: parsed.currentUserId || fallback.currentUserId,
      currentTab: parsed.currentTab || fallback.currentTab,
      leagues: parsed.leagues?.length ? parsed.leagues : fallback.leagues,
      leagueEntries: parsed.leagueEntries || fallback.leagueEntries,
      selectedLeagueId: parsed.selectedLeagueId || fallback.selectedLeagueId,
      users: parsed.users?.length ? parsed.users : fallback.users,
    }
  } catch {
    return fallback
  }
}

function generateCode(seed) {
  return `${seed.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5)}${Math.floor(
    100 + Math.random() * 900,
  )}`.slice(0, 8)
}

function sign(value) {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

function parseStartsAt(match) {
  return match?.startsAt ? new Date(match.startsAt).getTime() : null
}

function lockTimestamp(match) {
  const startsAt = parseStartsAt(match)
  if (!startsAt) {
    return null
  }

  return startsAt - EDIT_LOCK_MS
}

function firstCompetitionKickoff(matches) {
  const timestamps = matches.map((match) => parseStartsAt(match)).filter(Boolean)

  if (!timestamps.length) {
    return null
  }

  return Math.min(...timestamps)
}

function sortRounds(rounds) {
  return [...rounds].sort((left, right) => {
    const leftNumber = Number(left.match(/\d+/)?.[0] || 0)
    const rightNumber = Number(right.match(/\d+/)?.[0] || 0)

    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber
    }

    return left.localeCompare(right)
  })
}

function isMatchLocked(match, now) {
  const startsAt = parseStartsAt(match)

  if (match.status === 'completed') {
    return true
  }

  if (!startsAt) {
    return false
  }

  return now >= startsAt - EDIT_LOCK_MS
}

function isPredictionRevealed(match, now) {
  const startsAt = parseStartsAt(match)

  if (match.status === 'completed') {
    return true
  }

  if (!startsAt) {
    return false
  }

  return now >= startsAt
}

function formatCountdown(target, now) {
  if (!target) {
    return 'Sin hora'
  }

  const diff = target - now
  if (diff <= 0) {
    return 'Cerrado'
  }

  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

function calculateMatchPoints(prediction, result, stageKey, scoring) {
  if (
    !prediction ||
    !result ||
    prediction.home === '' ||
    prediction.away === '' ||
    prediction.home === null ||
    prediction.away === null
  ) {
    return 0
  }

  const predictedDiff = prediction.home - prediction.away
  const actualDiff = result.home - result.away
  const stageExtra = Number(scoring.stagePoints?.[stageKey] || 0)

  if (prediction.home === result.home && prediction.away === result.away) {
    return Number(scoring.matchPoints.exact) + stageExtra
  }

  if (predictedDiff === actualDiff) {
    return Number(scoring.matchPoints.goalDiff) + stageExtra
  }

  if (sign(predictedDiff) === sign(actualDiff)) {
    return Number(scoring.matchPoints.outcome) + stageExtra
  }

  return 0
}

function calculateBonusPoints(bonusPicks, competitionResults, scoring) {
  return bonusFields.reduce((sum, field) => {
    if (!competitionResults?.[field.id]) {
      return sum
    }

    return (
      sum +
      (bonusPicks?.[field.id] === competitionResults[field.id]
        ? Number(scoring.bonusPoints?.[field.id] || 0)
        : 0)
    )
  }, 0)
}

function calculateLeagueScore(league, entry, competitionData) {
  if (!league || !entry || !competitionData) {
    return { total: 0, matchPoints: 0, bonusPoints: 0 }
  }

  const matchPoints = competitionData.matches.reduce((sum, match) => {
    return (
      sum +
      calculateMatchPoints(
        entry.predictions?.[match.id],
        match.result,
        match.stageKey,
        league.scoring,
      )
    )
  }, 0)

  const bonusPoints = calculateBonusPoints(
    entry.bonusPicks,
    competitionData.competitionResults,
    league.scoring,
  )

  return {
    total: matchPoints + bonusPoints,
    matchPoints,
    bonusPoints,
  }
}

function App() {
  const persistedState = loadState()
  const [currentUserId, setCurrentUserId] = useState(
    isSupabaseConfigured ? '' : persistedState.currentUserId,
  )
  const [currentTab, setCurrentTab] = useState(persistedState.currentTab)
  const [users, setUsers] = useState(isSupabaseConfigured ? [] : persistedState.users)
  const [leagues, setLeagues] = useState(isSupabaseConfigured ? [] : persistedState.leagues)
  const [leagueEntries, setLeagueEntries] = useState(
    isSupabaseConfigured ? {} : persistedState.leagueEntries,
  )
  const [selectedLeagueId, setSelectedLeagueId] = useState(
    isSupabaseConfigured ? '' : persistedState.selectedLeagueId,
  )
  const [homeLeagueView, setHomeLeagueView] = useState('list')
  const [fixturesByCompetition, setFixturesByCompetition] = useState(
    fallbackFixturesByCompetition,
  )
  const [selectedPool, setSelectedPool] = useState(featuredPools[0].id)
  const [leagueForm, setLeagueForm] = useState(initialLeagueForm)
  const [selectedMatchRound, setSelectedMatchRound] = useState('')
  const [selectedHistoryRound, setSelectedHistoryRound] = useState('')
  const [authMode, setAuthMode] = useState('signup')
  const [signupForm, setSignupForm] = useState(initialAuthForm)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [pendingInviteCode, setPendingInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [inviteFeedback, setInviteFeedback] = useState('')
  const [approvalFeedback, setApprovalFeedback] = useState('')
  const [requestActionKey, setRequestActionKey] = useState('')
  const [selectedBonusViewerId, setSelectedBonusViewerId] = useState('')
  const [isBooting, setIsBooting] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [isRemoteSyncing, setIsRemoteSyncing] = useState(false)
  const [remoteAuthUser, setRemoteAuthUser] = useState(null)
  const hasBootedRef = useRef(false)
  const remoteSyncRef = useRef(Promise.resolve())

  const refreshRemoteState = async (userId, preferredLeagueId = selectedLeagueId) => {
    if (!isSupabaseConfigured || !userId) {
      return
    }

    remoteSyncRef.current = remoteSyncRef.current.then(async () => {
      setIsRemoteSyncing(true)

      try {
        const snapshot = await fetchRemoteSnapshot(userId, buildDefaultScoring)
        setUsers(snapshot.users)
        setLeagues(snapshot.leagues)
        setLeagueEntries(snapshot.leagueEntries)
        setSelectedLeagueId((current) => {
          const targetLeagueId = preferredLeagueId || current
          if (targetLeagueId && snapshot.leagues.some((league) => league.id === targetLeagueId)) {
            return targetLeagueId
          }

          return snapshot.selectedLeagueId
        })
      } finally {
        setIsRemoteSyncing(false)
      }
    })

    return remoteSyncRef.current
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (hasBootedRef.current) {
      return undefined
    }

    hasBootedRef.current = true
    let mounted = true

    const boot = async () => {
      try {
        const fixturePromise = fetch('/fixtures.json', { cache: 'no-store' })
        const sessionPromise = isSupabaseConfigured
          ? supabase.auth.getSession()
          : Promise.resolve({ data: { session: null } })

        const [fixtureResponse, sessionResponse] = await Promise.all([
          fixturePromise,
          sessionPromise,
        ])

        if (fixtureResponse.ok) {
          const payload = await fixtureResponse.json()
          if (mounted && payload?.competitions) {
            setFixturesByCompetition(payload.competitions)
          }
        }

        const sessionUser = sessionResponse?.data?.session?.user
        if (mounted && isSupabaseConfigured) {
          setUsers([])
          setLeagues([])
          setLeagueEntries({})
          setSelectedLeagueId('')
          setRemoteAuthUser(
            sessionUser
              ? {
                  id: sessionUser.id,
                  name:
                    sessionUser.user_metadata?.name ||
                    sessionUser.email?.split('@')[0] ||
                    'Jugador',
                  email: sessionUser.email,
                }
              : null,
          )
          setCurrentUserId(sessionUser?.id || '')
          if (sessionUser?.id) {
            await ensureRemoteProfile(sessionUser)
            await refreshRemoteState(sessionUser.id)
          }
        }
      } finally {
        window.setTimeout(() => {
          if (mounted) {
            setIsBooting(false)
          }
        }, 900)
      }
    }

    boot()

    let subscription = null
    if (isSupabaseConfigured) {
      const authListener = supabase.auth.onAuthStateChange((_event, session) => {
        const sessionUser = session?.user || null

        if (!mounted) {
          return
        }

        setCurrentUserId(sessionUser?.id || '')
        setRemoteAuthUser(
          sessionUser
            ? {
                id: sessionUser.id,
                name:
                  sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Jugador',
                email: sessionUser.email,
              }
            : null,
        )

        if (!sessionUser?.id) {
          setUsers([])
          setLeagues([])
          setLeagueEntries({})
          setSelectedLeagueId('')
          setRemoteAuthUser(null)
          return
        }

        window.setTimeout(() => {
          ensureRemoteProfile(sessionUser)
            .then(() => refreshRemoteState(sessionUser.id))
            .catch(() => {
              setAuthMessage('No pudimos sincronizar tu sesion con Supabase.')
            })
        }, 0)
      })

      subscription = authListener.data.subscription
    }

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setPendingInviteCode(invite)
      setJoinCode(invite)
      setCurrentTab('settings')
    }
  }, [])

  useEffect(() => {
    if (isSupabaseConfigured) {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentUserId,
        currentTab,
        leagues,
        leagueEntries,
        selectedLeagueId,
        users,
      }),
    )
  }, [currentUserId, currentTab, leagues, leagueEntries, selectedLeagueId, users])

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      refreshRemoteState(currentUserId).catch(() => {})
    }, 12000)

    return () => window.clearInterval(intervalId)
  }, [currentUserId])

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) || remoteAuthUser || null,
    [currentUserId, remoteAuthUser, users],
  )

  const myLeagues = useMemo(() => {
    if (!currentUser) {
      return []
    }

    return leagues.filter(
      (league) =>
        league.members.includes(currentUser.id) ||
        league.joinRequests?.some(
          (request) => request.userId === currentUser.id && request.status === 'pending',
        ),
    )
  }, [currentUser, leagues])

  const activeLeague = useMemo(() => {
    return myLeagues.find((league) => league.id === selectedLeagueId) || myLeagues[0] || null
  }, [myLeagues, selectedLeagueId])

  const activeCompetitionData = useMemo(() => {
    if (!activeLeague) {
      return fallbackFixturesByCompetition.champions
    }

    return (
      fixturesByCompetition[activeLeague.competitionId] ||
      fallbackFixturesByCompetition[activeLeague.competitionId] ||
      fallbackFixturesByCompetition.champions
    )
  }, [activeLeague, fixturesByCompetition])

  const activePool = useMemo(
    () => featuredPools.find((pool) => pool.id === selectedPool) || featuredPools[0],
    [selectedPool],
  )

  const serieARounds = useMemo(() => {
    if (activeLeague?.competitionId !== 'ecuador-serie-a') {
      return []
    }

    return sortRounds([...new Set(activeCompetitionData.matches.map((match) => match.round))])
  }, [activeCompetitionData.matches, activeLeague?.competitionId])

  const visibleMatches = useMemo(() => {
    if (activeLeague?.competitionId === 'ecuador-serie-a' && selectedMatchRound) {
      return activeCompetitionData.matches.filter((match) => match.round === selectedMatchRound)
    }

    return activeCompetitionData.matches
  }, [activeCompetitionData.matches, activeLeague?.competitionId, selectedMatchRound])

  useEffect(() => {
    if (activeLeague?.competitionId !== 'ecuador-serie-a') {
      setSelectedMatchRound('')
      return
    }

    const nextOpenRound = serieARounds.find((round) =>
      activeCompetitionData.matches
        .filter((match) => match.round === round)
        .some((match) => !isMatchLocked(match, now)),
    )

    setSelectedMatchRound((current) =>
      current && serieARounds.includes(current)
        ? current
        : nextOpenRound || serieARounds[serieARounds.length - 1] || '',
    )
  }, [activeCompetitionData.matches, activeLeague?.competitionId, activeLeague?.id, now, serieARounds])

  const openLeagueDetail = (leagueId) => {
    setSelectedLeagueId(leagueId)
    setHomeLeagueView('detail')
    setCurrentTab('home')
  }

  const closeLeagueDetail = () => {
    setHomeLeagueView('list')
  }

  const jumpToLeagueTab = (tabId) => {
    setCurrentTab(tabId)
    setHomeLeagueView('detail')
  }

  const pendingLeagueCount = useMemo(() => {
    return myLeagues.filter((league) =>
      league.joinRequests?.some(
        (request) => request.userId === currentUser?.id && request.status === 'pending',
      ),
    ).length
  }, [currentUser, myLeagues])

  const activeEntry = useMemo(() => {
    if (!activeLeague || !currentUser) {
      return null
    }

    return leagueEntries?.[activeLeague.id]?.[currentUser.id] || null
  }, [activeLeague, currentUser, leagueEntries])

  const isAdmin = activeLeague?.ownerId === currentUser?.id

  const pendingRequests = useMemo(() => {
    if (!activeLeague) {
      return []
    }

    return (activeLeague.joinRequests || []).filter((request) => request.status === 'pending')
  }, [activeLeague])

  const adminNotificationCount = useMemo(() => {
    return leagues.reduce((sum, league) => {
      if (league.ownerId !== currentUser?.id) {
        return sum
      }

      return (
        sum + (league.joinRequests || []).filter((request) => request.status === 'pending').length
      )
    }, 0)
  }, [currentUser, leagues])

  const leaderboard = useMemo(() => {
    if (!activeLeague) {
      return []
    }

    return activeLeague.members
      .map((userId) => {
        const user = users.find((item) => item.id === userId)
        const entry = leagueEntries?.[activeLeague.id]?.[userId]
        const score = calculateLeagueScore(activeLeague, entry, activeCompetitionData)

        return {
          userId,
          name: user?.name || 'Participante',
          ...score,
        }
      })
      .sort((left, right) => right.total - left.total)
  }, [activeCompetitionData, activeLeague, leagueEntries, users])

  const myScore = useMemo(() => {
    if (!activeLeague || !activeEntry) {
      return { total: 0, matchPoints: 0, bonusPoints: 0 }
    }

    return calculateLeagueScore(activeLeague, activeEntry, activeCompetitionData)
  }, [activeCompetitionData, activeEntry, activeLeague])

  const revealedMatches = useMemo(() => {
    return activeCompetitionData.matches.filter((match) => isPredictionRevealed(match, now))
  }, [activeCompetitionData.matches, now])

  const revealedRounds = useMemo(
    () => sortRounds([...new Set(revealedMatches.map((match) => match.round))]),
    [revealedMatches],
  )

  const visibleHistoryMatches = useMemo(() => {
    if (!selectedHistoryRound) {
      return revealedMatches
    }

    return revealedMatches.filter((match) => match.round === selectedHistoryRound)
  }, [revealedMatches, selectedHistoryRound])

  useEffect(() => {
    setSelectedHistoryRound((current) =>
      current && revealedRounds.includes(current)
        ? current
        : revealedRounds[revealedRounds.length - 1] || '',
    )
  }, [revealedRounds, activeLeague?.id])

  const bonusDeadline = useMemo(
    () => firstCompetitionKickoff(activeCompetitionData.matches),
    [activeCompetitionData.matches],
  )

  const canEditBonusPicks = useMemo(() => {
    if (!activeLeague || !currentUser) {
      return false
    }

    if (!bonusDeadline) {
      return true
    }

    if (now < bonusDeadline) {
      return true
    }

    return Boolean(activeLeague.bonusEditOverrides?.[currentUser.id])
  }, [activeLeague, bonusDeadline, currentUser, now])

  const latestInviteLeague = myLeagues.find((league) => league.ownerId === currentUser?.id) || null

  const updateLeagueEntry = (leagueId, userId, updater) => {
    setLeagueEntries((current) => ({
      ...current,
      [leagueId]: {
        ...(current[leagueId] || {}),
        [userId]: updater(current[leagueId]?.[userId]),
      },
    }))
  }

  const ensureMemberEntry = (league, userId) => {
    setLeagueEntries((current) => {
      if (current?.[league.id]?.[userId]) {
        return current
      }

      return {
        ...current,
        [league.id]: {
          ...(current[league.id] || {}),
          [userId]: buildEntry(league.competitionId),
        },
      }
    })
  }

  const requestJoinLeague = async (inviteCode) => {
    if (!currentUser || !inviteCode) {
      return
    }

    if (isSupabaseConfigured) {
      try {
        const targetLeague = await requestJoinLeagueRemote(inviteCode, currentUser.id)

        if (targetLeague) {
          await refreshRemoteState(currentUser.id, targetLeague.id)
          setInviteFeedback(
            `Solicitud enviada a ${targetLeague.name}. El admin debe aprobar o bloquear tu ingreso.`,
          )
          setCurrentTab('settings')
        } else {
          setInviteFeedback('No encontramos una liga con ese codigo.')
        }
      } catch (error) {
        setInviteFeedback(
          error?.message
            ? `No pudimos enviar la solicitud: ${error.message}`
            : 'No pudimos enviar la solicitud. Revisa la configuracion de Supabase.',
        )
      }

      return
    }

    let targetLeague = null

    setLeagues((current) =>
      current.map((league) => {
        if (league.inviteCode !== inviteCode) {
          return league
        }

        targetLeague = league

        if (league.members.includes(currentUser.id)) {
          return league
        }

        const existingRequest = (league.joinRequests || []).find(
          (request) => request.userId === currentUser.id,
        )

        if (existingRequest && existingRequest.status === 'pending') {
          return league
        }

        return {
          ...league,
          joinRequests: [
            ...(league.joinRequests || []).filter((request) => request.userId !== currentUser.id),
            {
              userId: currentUser.id,
              requestedAt: new Date().toISOString(),
              status: 'pending',
            },
          ],
        }
      }),
    )

    if (targetLeague) {
      setSelectedLeagueId(targetLeague.id)
      setInviteFeedback(
        `Solicitud enviada a ${targetLeague.name}. El admin debe aprobar o bloquear tu ingreso.`,
      )
      setCurrentTab('settings')
    } else {
      setInviteFeedback('No encontramos una liga con ese codigo.')
    }
  }

  useEffect(() => {
    if (currentUser && pendingInviteCode) {
      requestJoinLeague(pendingInviteCode)
      setPendingInviteCode('')
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('invite')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [currentUser, pendingInviteCode])

  const handleRequestDecision = async (userId, nextStatus) => {
    if (!activeLeague || !isAdmin) {
      return
    }

    setRequestActionKey(`${userId}-${nextStatus}`)

    if (isSupabaseConfigured) {
      try {
        await updateJoinRequestRemote({
          leagueId: activeLeague.id,
          userId,
          nextStatus,
          competitionId: activeLeague.competitionId,
          entry: buildEntry(activeLeague.competitionId),
        })

        setLeagues((current) =>
          current.map((league) => {
            if (league.id !== activeLeague.id) {
              return league
            }

            return {
              ...league,
              members:
                nextStatus === 'approved' && !league.members.includes(userId)
                  ? [...league.members, userId]
                  : league.members,
              joinRequests: (league.joinRequests || []).map((request) =>
                request.userId === userId ? { ...request, status: nextStatus } : request,
              ),
            }
          }),
        )

        await refreshRemoteState(currentUser.id, activeLeague.id)
        setApprovalFeedback(
          nextStatus === 'approved'
            ? 'Solicitud aprobada correctamente.'
            : 'Solicitud bloqueada correctamente.',
        )
      } catch (error) {
        setApprovalFeedback(
          error?.message
            ? `No pudimos actualizar la solicitud: ${error.message}`
            : 'No pudimos actualizar la solicitud.',
        )
      } finally {
        setRequestActionKey('')
      }

      return
    }

    setLeagues((current) =>
      current.map((league) => {
        if (league.id !== activeLeague.id) {
          return league
        }

        const updatedRequests = (league.joinRequests || []).map((request) =>
          request.userId === userId ? { ...request, status: nextStatus } : request,
        )

        return {
          ...league,
          joinRequests: updatedRequests,
          members:
            nextStatus === 'approved' && !league.members.includes(userId)
              ? [...league.members, userId]
              : league.members,
        }
      }),
    )

    if (nextStatus === 'approved') {
      ensureMemberEntry(activeLeague, userId)
    }

    setApprovalFeedback(
      nextStatus === 'approved'
        ? 'Solicitud aprobada correctamente.'
        : 'Solicitud bloqueada correctamente.',
    )
    setRequestActionKey('')
  }

  const updatePrediction = async (match, side, value) => {
    if (!activeLeague || !currentUser || isMatchLocked(match, now)) {
      return
    }

    if (value === '') {
      const currentEntry = leagueEntries?.[activeLeague.id]?.[currentUser.id] || buildEntry(activeLeague.competitionId)
      const nextPredictions = { ...currentEntry.predictions }

      if (nextPredictions[match.id]) {
        nextPredictions[match.id] = {
          ...nextPredictions[match.id],
          [side]: '',
        }
      }

      const nextEntry = {
        ...currentEntry,
        predictions: nextPredictions,
      }

      updateLeagueEntry(activeLeague.id, currentUser.id, () => nextEntry)

      if (isSupabaseConfigured) {
        try {
          await saveLeagueEntryRemote(activeLeague.id, currentUser.id, nextEntry)
        } catch {
          setInviteFeedback('No pudimos guardar tu pronostico en la nube.')
        }
      }

      return
    }

    const safeValue = Math.max(0, Math.min(9, Number(value) || 0))
    const currentEntry = leagueEntries?.[activeLeague.id]?.[currentUser.id] || buildEntry(activeLeague.competitionId)
    const nextEntry = {
      ...currentEntry,
      predictions: {
        ...currentEntry.predictions,
        [match.id]: {
          ...(currentEntry.predictions?.[match.id] || { home: 0, away: 0 }),
          [side]: safeValue,
        },
      },
    }

    updateLeagueEntry(activeLeague.id, currentUser.id, () => nextEntry)

    if (isSupabaseConfigured) {
      try {
        await saveLeagueEntryRemote(activeLeague.id, currentUser.id, nextEntry)
      } catch {
        setInviteFeedback('No pudimos guardar tu pronostico en la nube.')
      }
    }
  }

  const updateBonusPick = async (field, value) => {
    if (!activeLeague || !currentUser || !canEditBonusPicks) {
      return
    }

    const currentEntry = leagueEntries?.[activeLeague.id]?.[currentUser.id] || buildEntry(activeLeague.competitionId)
    const nextEntry = {
      ...currentEntry,
      bonusPicks: {
        ...(currentEntry.bonusPicks || defaultBonusPicks()),
        [field]: value,
      },
    }

    updateLeagueEntry(activeLeague.id, currentUser.id, () => nextEntry)

    if (isSupabaseConfigured) {
      try {
        await saveLeagueEntryRemote(activeLeague.id, currentUser.id, nextEntry)
      } catch {
        setInviteFeedback('No pudimos guardar tus picks extra en la nube.')
      }
    }
  }

  const toggleBonusPermission = async (userId, enabled) => {
    if (!activeLeague || !isAdmin) {
      return
    }

    const nextOverrides = {
      ...(activeLeague.bonusEditOverrides || {}),
      [userId]: enabled,
    }

    setLeagues((current) =>
      current.map((league) =>
        league.id === activeLeague.id
          ? {
              ...league,
              bonusEditOverrides: nextOverrides,
            }
          : league,
      ),
    )

    if (isSupabaseConfigured) {
      try {
        await updateLeagueBonusOverridesRemote(activeLeague.id, nextOverrides)
        setApprovalFeedback(
          enabled
            ? 'Permiso extra habilitado para editar picks del torneo.'
            : 'Permiso extra retirado para picks del torneo.',
        )
      } catch (error) {
        setApprovalFeedback(
          error?.message
            ? `No pudimos cambiar el permiso de picks extra: ${error.message}`
            : 'No pudimos cambiar el permiso de picks extra.',
        )
      }
    }
  }

  const updateScoring = async (group, field, value) => {
    if (!activeLeague || !isAdmin) {
      return
    }

    const safeValue = Math.max(0, Number(value) || 0)
    let nextScoring = activeLeague.scoring

    setLeagues((current) =>
      current.map((league) => {
        if (league.id !== activeLeague.id) {
          return league
        }

        nextScoring = {
          ...league.scoring,
          [group]: {
            ...league.scoring[group],
            [field]: safeValue,
          },
        }

        return {
          ...league,
          scoring: nextScoring,
        }
      }),
    )

    if (isSupabaseConfigured) {
      try {
        await updateLeagueScoringRemote(activeLeague.id, nextScoring)
      } catch {
        setInviteFeedback('No pudimos guardar las reglas en Supabase.')
      }
    }
  }

  const handleSignup = async (event) => {
    event.preventDefault()

    const email = signupForm.email.trim().toLowerCase()
    const name = signupForm.name.trim()

    if (!email || !name || !signupForm.password.trim()) {
      setAuthMessage('Completa nombre, correo y clave para crear tu cuenta.')
      return
    }

    if (users.some((user) => user.email.toLowerCase() === email)) {
      setAuthMessage('Ese correo ya tiene una cuenta. Inicia sesion.')
      setAuthMode('login')
      return
    }

    if (isSupabaseConfigured) {
      try {
        const { session, user } = await signUpRemote({
          email,
          password: signupForm.password,
          name,
        })

        setSignupForm(initialAuthForm)
        setAuthMessage(
          session || user?.identities?.length
            ? 'Cuenta creada. Ya puedes entrar y probar tu liga real.'
            : 'Cuenta creada. Revisa tu correo si Supabase tiene confirmacion activada.',
        )
      } catch (error) {
        setAuthMessage(error.message || 'No pudimos crear la cuenta en Supabase.')
      }

      return
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password: signupForm.password,
    }

    setUsers((current) => [newUser, ...current])
    setCurrentUserId(newUser.id)
    setSignupForm(initialAuthForm)
    setAuthMessage('Cuenta creada. Ya puedes armar tu primera liga.')
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const email = loginForm.email.trim().toLowerCase()

    if (isSupabaseConfigured) {
      try {
        await signInRemote({
          email,
          password: loginForm.password,
        })
        setLoginForm({ email: '', password: '' })
        setAuthMessage('Sesion iniciada correctamente en Supabase.')
      } catch (error) {
        setAuthMessage(error.message || 'Correo o clave invalidos.')
      }

      return
    }

    const foundUser = users.find(
      (user) => user.email.toLowerCase() === email && user.password === loginForm.password,
    )

    if (!foundUser) {
      setAuthMessage('Correo o clave invalidos.')
      return
    }

    setCurrentUserId(foundUser.id)
    setLoginForm({ email: '', password: '' })
    setAuthMessage('Sesion iniciada correctamente.')
  }

  const handleCreateLeague = async (event) => {
    event.preventDefault()

    if (!currentUser) {
      return
    }

    const trimmedName = leagueForm.leagueName.trim()
    if (!trimmedName) {
      return
    }

    const competition =
      competitionOptions.find((item) => item.id === leagueForm.competitionId) ||
      competitionOptions[0]

    const newLeague = {
      id: `league-${Date.now()}`,
      name: trimmedName,
      code: generateCode(trimmedName),
      inviteCode: generateCode(`${trimmedName}INV`),
      type: leagueForm.privacy,
      competition: competition.name,
      competitionId: competition.id,
      entry: leagueForm.entry,
      prize: leagueForm.prize,
      ownerId: currentUser.id,
      members: [currentUser.id],
      joinRequests: [],
      scoring: buildDefaultScoring(),
      bonusEditOverrides: buildBonusEditOverrides(),
      deadline: 'Proxima fecha',
    }

    const ownerEntry = buildEntry(newLeague.competitionId)

    if (isSupabaseConfigured) {
      try {
        await createLeagueRemote(newLeague, currentUser.id, ownerEntry)
        await refreshRemoteState(currentUser.id, newLeague.id)
        setSelectedLeagueId(newLeague.id)
        setCurrentTab('matches')
        setLeagueForm(initialLeagueForm)
        setInviteFeedback('Liga creada en Supabase. Ya puedes compartirla con usuarios reales.')
      } catch (error) {
        setInviteFeedback(
          error?.message
            ? `No pudimos crear la liga en Supabase: ${error.message}`
            : 'No pudimos crear la liga en Supabase.',
        )
      }

      return
    }

    setLeagues((current) => [newLeague, ...current])
    setLeagueEntries((current) => ({
      ...current,
      [newLeague.id]: {
        [currentUser.id]: ownerEntry,
      },
    }))
    setSelectedLeagueId(newLeague.id)
    setCurrentTab('matches')
    setLeagueForm(initialLeagueForm)
    setInviteFeedback('Liga creada. Ya puedes compartir link y configurar reglas.')
  }

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      try {
        await signOutRemote()
        setAuthMessage('Sesion cerrada.')
      } catch {
        setAuthMessage('No pudimos cerrar la sesion.')
      }

      return
    }

    setCurrentUserId('')
    setAuthMessage('Sesion cerrada.')
  }

  const handleDeleteLeague = async () => {
    if (!activeLeague || !isAdmin) {
      return
    }

    if (!window.confirm(`Se borrara ${activeLeague.name} junto con sus miembros y pronosticos.`)) {
      return
    }

    if (isSupabaseConfigured) {
      try {
        await deleteLeagueRemote(activeLeague.id, currentUser.id)
        await refreshRemoteState(currentUser.id)
        setInviteFeedback('Liga eliminada correctamente.')
      } catch (error) {
        setInviteFeedback(error?.message || 'No pudimos borrar la liga.')
      }

      return
    }

    setLeagues((current) => current.filter((league) => league.id !== activeLeague.id))
    setLeagueEntries((current) => {
      const next = { ...current }
      delete next[activeLeague.id]
      return next
    })
    setSelectedLeagueId('')
    setCurrentTab('home')
    setInviteFeedback('Liga eliminada correctamente.')
  }

  const handleLeaveLeague = async () => {
    if (!activeLeague || isAdmin || !currentUser) {
      return
    }

    if (!window.confirm(`Vas a abandonar ${activeLeague.name}.`)) {
      return
    }

    if (isSupabaseConfigured) {
      try {
        await leaveLeagueRemote(activeLeague.id, currentUser.id)
        await refreshRemoteState(currentUser.id)
        setInviteFeedback('Saliste de la liga correctamente.')
        setCurrentTab('home')
      } catch (error) {
        setInviteFeedback(error?.message || 'No pudimos salir de la liga.')
      }

      return
    }

    setLeagues((current) =>
      current.map((league) =>
        league.id === activeLeague.id
          ? { ...league, members: league.members.filter((memberId) => memberId !== currentUser.id) }
          : league,
      ),
    )
    setLeagueEntries((current) => {
      const next = { ...current }
      if (next[activeLeague.id]) {
        next[activeLeague.id] = { ...next[activeLeague.id] }
        delete next[activeLeague.id][currentUser.id]
      }
      return next
    })
    setSelectedLeagueId('')
    setCurrentTab('home')
    setInviteFeedback('Saliste de la liga correctamente.')
  }

  const handleRemoveMember = async (userId) => {
    if (!activeLeague || !isAdmin || userId === currentUser?.id) {
      return
    }

    const member = users.find((item) => item.id === userId)
    if (!window.confirm(`Vas a expulsar a ${member?.name || 'este jugador'} de la liga.`)) {
      return
    }

    if (isSupabaseConfigured) {
      try {
        await removeLeagueMemberRemote(activeLeague.id, userId)
        await refreshRemoteState(currentUser.id, activeLeague.id)
        setInviteFeedback('Jugador removido de la liga.')
      } catch (error) {
        setInviteFeedback(error?.message || 'No pudimos remover al jugador.')
      }

      return
    }

    setLeagues((current) =>
      current.map((league) =>
        league.id === activeLeague.id
          ? { ...league, members: league.members.filter((memberId) => memberId !== userId) }
          : league,
      ),
    )
    setLeagueEntries((current) => {
      const next = { ...current }
      if (next[activeLeague.id]) {
        next[activeLeague.id] = { ...next[activeLeague.id] }
        delete next[activeLeague.id][userId]
      }
      return next
    })
    setInviteFeedback('Jugador removido de la liga.')
  }

  const copyInviteLink = async (league) => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://pollasa.app'
    const inviteLink = `${origin}/?invite=${league.inviteCode}`

    try {
      await navigator.clipboard.writeText(inviteLink)
      setInviteFeedback(`Link copiado: ${inviteLink}`)
    } catch {
      setInviteFeedback(`Comparte este link: ${inviteLink}`)
    }
  }

  if (isBooting) {
    return (
      <main className="splash-screen">
        <div className="status-bar-banner status-bar-banner-light" aria-hidden="true" />
        <div className="splash-card">
          <img className="splash-logo" src={pollasaLogo} alt="POLLASA logo" />
        </div>
      </main>
    )
  }

  if (!currentUser) {
    return (
      <main className="auth-shell">
        <div className="status-bar-banner status-bar-banner-light" aria-hidden="true" />
        <section className="hero-section auth-surface">
          <div className="auth-layout">
            <div className="auth-brand">
              <img className="brand-logo auth-logo" src={pollasaLogo} alt="POLLASA logo" />
              <div>
                <p className="eyebrow">Cuentas, ligas e invitaciones</p>
                <h1>POLLASA</h1>
              </div>
              <h2 className="auth-title">Entra a tu polla y compite jornada a jornada.</h2>
              <p className="auth-copy">
                El admin recibe solicitudes de ingreso, aprueba participantes y controla
                reglas, bloqueos y tabla en vivo.
              </p>
              <p className="auth-message">
                {isSupabaseConfigured
                  ? 'Modo real activado con Supabase. Las cuentas y ligas quedan compartidas entre usuarios.'
                  : 'Modo demo local activo. Para pruebas reales conecta Supabase y Vercel.'}
              </p>
            </div>

            <div className="glass-card auth-card">
              <div className="auth-tabs">
                <button
                  className={authMode === 'signup' ? 'nav-link active' : 'nav-link'}
                  onClick={() => setAuthMode('signup')}
                >
                  Crear cuenta
                </button>
                <button
                  className={authMode === 'login' ? 'nav-link active' : 'nav-link'}
                  onClick={() => setAuthMode('login')}
                >
                  Iniciar sesion
                </button>
              </div>

              {authMode === 'signup' ? (
                <form className="auth-form" onSubmit={handleSignup}>
                  <label className="field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={signupForm.name}
                      onChange={(event) =>
                        setSignupForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Correo</span>
                    <input
                      type="email"
                      value={signupForm.email}
                      onChange={(event) =>
                        setSignupForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Clave</span>
                    <input
                      type="password"
                      value={signupForm.password}
                      onChange={(event) =>
                        setSignupForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                  </label>
                  <button className="primary-btn full" type="submit">
                    Crear mi cuenta
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleLogin}>
                  <label className="field">
                    <span>Correo</span>
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Clave</span>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                  </label>
                  <button className="primary-btn full" type="submit">
                    Entrar a POLLASA
                  </button>
                </form>
              )}

              <p className="auth-message">
                {authMessage ||
                  (isSupabaseConfigured
                    ? 'Crea cuentas reales o inicia sesion con Supabase.'
                    : 'Demo local lista para probar.')}
              </p>
              {!isSupabaseConfigured && (
                <p className="auth-message">Demo: `carlos@pollasa.app` / `123456`</p>
              )}
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell with-bottom-tabs">
      <div className="status-bar-banner" aria-hidden="true" />

      <header className="topbar mobile-topbar">
        <div className="brand-lockup compact-brand">
          <img className="brand-logo compact" src={pollasaLogo} alt="POLLASA logo" />
          <div>
            <p className="eyebrow">Tu liga activa</p>
            <h1>{activeLeague?.name || 'POLLASA'}</h1>
          </div>
        </div>
        <div className="profile-chip">
          <span>Hola</span>
          <strong>{currentUser.name}</strong>
          <button className="logout-link" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <section className="hero-section app-surface app-content">
        {currentTab === 'home' && (
          <div className="tab-stack">
            {homeLeagueView === 'detail' && activeLeague ? (
              <div className="glass-card league-detail-screen">
                <div className="league-detail-topbar">
                  <button className="secondary-btn league-back-btn" onClick={closeLeagueDetail}>
                    Volver
                  </button>
                  <span className="muted-chip">{activeLeague.competition}</span>
                </div>

                <div className="league-detail-hero">
                  <div>
                    <p className="eyebrow">Vista dedicada de liga</p>
                    <h2>{activeLeague.name}</h2>
                    <p className="fixtures-footnote">
                      Toda la informacion que abras desde aqui se queda filtrada en esta liga.
                    </p>
                  </div>
                  <div className="league-detail-meta">
                    <span>{activeLeague.members.length} jugadores</span>
                    <span>{activeLeague.entry}</span>
                    <span>{activeLeague.prize}</span>
                  </div>
                </div>

                <div className="league-detail-summary">
                  <article className="league-detail-stat">
                    <strong>{myScore.total}</strong>
                    <small>Tus puntos</small>
                  </article>
                  <article className="league-detail-stat">
                    <strong>
                      #
                      {Math.max(
                        1,
                        leaderboard.findIndex((player) => player.userId === currentUser.id) + 1,
                      )}
                    </strong>
                    <small>Posicion actual</small>
                  </article>
                  <article className="league-detail-stat">
                    <strong>{pendingRequests.length}</strong>
                    <small>Solicitudes pendientes</small>
                  </article>
                </div>

                <div className="league-detail-actions">
                  <button className="primary-btn" onClick={() => jumpToLeagueTab('matches')}>
                    Abrir partidos
                  </button>
                  <button className="secondary-btn" onClick={() => jumpToLeagueTab('table')}>
                    Ver tabla
                  </button>
                  <button className="secondary-btn" onClick={() => jumpToLeagueTab('history')}>
                    Revisar historial
                  </button>
                  <button className="secondary-btn" onClick={() => jumpToLeagueTab('settings')}>
                    Ajustes de liga
                  </button>
                </div>

                <div className="league-detail-panels">
                  <article className="league-detail-card">
                    <span className="section-tag">Proximo paso</span>
                    <h3>
                      {activeCompetitionData.matches.find((match) => !isMatchLocked(match, now))
                        ? 'Todavia puedes editar resultados'
                        : 'La jornada actual ya esta bloqueada'}
                    </h3>
                    <p>
                      {activeCompetitionData.matches.find((match) => !isMatchLocked(match, now))
                        ? 'Entra a Partidos para completar o corregir tus pronosticos antes del cierre.'
                        : 'Ahora solo queda seguir la tabla y esperar el siguiente partido habilitado.'}
                    </p>
                  </article>

                  <article className="league-detail-card">
                    <span className="section-tag">Acceso</span>
                    <h3>
                      {isAdmin
                        ? `Codigo ${activeLeague.inviteCode}`
                        : 'Participacion confirmada'}
                    </h3>
                    <p>
                      {isAdmin
                        ? 'Comparte el link de invitacion y aprueba nuevos ingresos desde Ajustes.'
                        : 'Tu cupo ya esta dentro de la liga y veras la tabla en tiempo real.'}
                    </p>
                  </article>
                </div>
              </div>
            ) : (
              <div className="glass-card league-browser">
                <div className="panel-header">
                  <h3>Mis ligas</h3>
                  <span className="muted-chip">
                    {myLeagues.length} activas · {pendingLeagueCount} pendientes
                  </span>
                </div>

                <div className="league-browser-grid">
                  {myLeagues.map((league) => {
                    const leagueScore = calculateLeagueScore(
                      league,
                      leagueEntries?.[league.id]?.[currentUser.id],
                      fixturesByCompetition[league.competitionId] ||
                        fallbackFixturesByCompetition[league.competitionId] ||
                        fallbackFixturesByCompetition.champions,
                    )
                    const isPending = (league.joinRequests || []).some(
                      (request) =>
                        request.userId === currentUser.id && request.status === 'pending',
                    )

                    return (
                      <button
                        key={league.id}
                        className={
                          selectedLeagueId === league.id
                            ? 'league-browser-card active'
                            : 'league-browser-card'
                        }
                        onClick={() => openLeagueDetail(league.id)}
                      >
                        <span>{league.competition}</span>
                        <strong>{league.name}</strong>
                        <small>
                          {isPending
                            ? 'Pendiente de aprobacion'
                            : `${leagueScore.total} pts · ${league.members.length} jugadores`}
                        </small>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="hero-grid">
              <div className="hero-copy">
                <span className="hero-pill">Bloqueo automatico y tabla viva</span>
                <h2>
                  La app ya separa todo en <span>tabs</span> y respeta el tiempo limite.
                </h2>
                <p>
                  Los cambios se permiten hasta 2 minutos antes del inicio de cada partido.
                  Cuando arranca, los pronosticos se revelan y ya no se pueden editar.
                </p>
                <div className="hero-actions">
                  <button
                    className="primary-btn"
                    onClick={() =>
                      activeLeague ? openLeagueDetail(activeLeague.id) : setCurrentTab('matches')
                    }
                  >
                    Abrir partidos
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      activeLeague ? openLeagueDetail(activeLeague.id) : setCurrentTab('table')
                    }
                  >
                    Ver tabla
                  </button>
                </div>

                <div className="stats-row">
                  <article className="stat-card">
                    <strong>{myLeagues.length}</strong>
                    <span>ligas en tu cuenta</span>
                  </article>
                  <article className="stat-card">
                    <strong>{myScore.total}</strong>
                    <span>puntos en la liga activa</span>
                  </article>
                  <article className="stat-card">
                    <strong>{adminNotificationCount}</strong>
                    <span>solicitudes pendientes para admins</span>
                  </article>
                  <article className="stat-card">
                    <strong>{isSupabaseConfigured ? 'Real' : 'Demo'}</strong>
                    <span>{isRemoteSyncing ? 'sincronizando nube' : 'modo de datos activo'}</span>
                  </article>
                </div>
              </div>

              <div className="hero-panel">
                <div className="glass-card spotlight">
                  <div className="panel-header">
                    <span className="section-tag">Competiciones</span>
                    <span className="live-dot">Live</span>
                  </div>
                  <h3>{activePool.title}</h3>
                  <p>Escoge una competicion y arma tu polla con reglas propias.</p>
                  <div className="pool-grid">
                    {featuredPools.map((pool) => (
                      <button
                        key={pool.id}
                        className={`pool-card ${pool.accent} ${
                          selectedPool === pool.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedPool(pool.id)}
                      >
                        <span>{pool.status}</span>
                        <strong>{pool.title}</strong>
                        <small>
                          {pool.players} jugadores · {pool.prize}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card create-form-card">
              <div className="panel-header">
                <h3>Crear nueva liga</h3>
                <span className="muted-chip">3 / 5 / 8 base</span>
              </div>
              <form className="create-grid compact-form" onSubmit={handleCreateLeague}>
                <label className="field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={leagueForm.leagueName}
                    onChange={(event) =>
                      setLeagueForm((current) => ({
                        ...current,
                        leagueName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Privacidad</span>
                  <select
                    value={leagueForm.privacy}
                    onChange={(event) =>
                      setLeagueForm((current) => ({
                        ...current,
                        privacy: event.target.value,
                      }))
                    }
                  >
                    <option>Privada</option>
                    <option>Publica</option>
                  </select>
                </label>
                <label className="field">
                  <span>Competicion</span>
                  <select
                    value={leagueForm.competitionId}
                    onChange={(event) =>
                      setLeagueForm((current) => ({
                        ...current,
                        competitionId: event.target.value,
                      }))
                    }
                  >
                    {competitionOptions.map((competition) => (
                      <option key={competition.id} value={competition.id}>
                        {competition.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Entrada</span>
                  <input
                    type="text"
                    value={leagueForm.entry}
                    onChange={(event) =>
                      setLeagueForm((current) => ({
                        ...current,
                        entry: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Premio</span>
                  <input
                    type="text"
                    value={leagueForm.prize}
                    onChange={(event) =>
                      setLeagueForm((current) => ({
                        ...current,
                        prize: event.target.value,
                      }))
                    }
                  />
                </label>
                <button className="primary-btn full" type="submit">
                  Crear liga
                </button>
              </form>
              <p className="auth-message create-feedback">
                {inviteFeedback || 'Cuando actives Supabase aqui veras errores o confirmaciones.'}
              </p>
            </div>
          </div>
        )}

        {currentTab === 'matches' && activeLeague && (
          <div className="tab-stack">
            <div className="glass-card league-context-card">
              <div className="panel-header">
                <div>
                  <span className="section-tag">Liga activa</span>
                  <h3>{activeLeague.name}</h3>
                </div>
                <span className="muted-chip">{activeLeague.competition}</span>
              </div>
              <p className="fixtures-footnote">
                Todo lo que ves en esta pantalla pertenece solo a esta liga: tabla,
                reglas, historial y solicitud de ingreso.
              </p>
            </div>

            <div className="glass-card bonus-panel">
              <div className="panel-header">
                <h3>Picks extra del torneo</h3>
                <span className="muted-chip">{myScore.bonusPoints} pts bonus</span>
              </div>
              <p className="fixtures-footnote">
                {bonusDeadline
                  ? now < bonusDeadline
                    ? `Se cierran cuando arranque el primer partido de la competicion. Quedan ${formatCountdown(
                        bonusDeadline,
                        now,
                      )}.`
                    : canEditBonusPicks
                      ? 'Tienes permiso especial del admin para modificar estos picks.'
                      : 'Se cerraron al jugarse la primera fecha. Solo el admin puede reabrirlos.'
                  : 'Estos picks se pueden llenar antes del inicio del torneo.'}
              </p>
              <div className="bonus-grid">
                {bonusFields.map((field) => (
                  <label key={field.id} className="field">
                    <span>{field.label}</span>
                    <input
                      type="text"
                      disabled={!canEditBonusPicks}
                      value={activeEntry?.bonusPicks?.[field.id] || ''}
                      onChange={(event) => updateBonusPick(field.id, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="glass-card predictions-panel">
              <div className="panel-header">
                <div>
                  <span className="section-tag">Partidos</span>
                  <h3>{activeLeague.competition}</h3>
                </div>
                <span className="muted-chip">{activeCompetitionData.updatedAt}</span>
              </div>

              {activeLeague.competitionId === 'ecuador-serie-a' && serieARounds.length > 0 && (
                <div className="round-switcher">
                  {serieARounds.map((round) => (
                    <button
                      key={round}
                      className={selectedMatchRound === round ? 'round-chip active' : 'round-chip'}
                      onClick={() => setSelectedMatchRound(round)}
                    >
                      {round}
                    </button>
                  ))}
                </div>
              )}

              <div className="match-list">
                {visibleMatches.map((match) => {
                  const locked = isMatchLocked(match, now)
                  const lockAt = lockTimestamp(match)
                  const reveal = isPredictionRevealed(match, now)

                  return (
                    <article key={`${activeLeague.id}-${match.id}`} className="match-card">
                      <div className="match-meta">
                        <span>{match.round}</span>
                        <span>{match.kickoff}</span>
                      </div>
                      <div className="match-lock-row">
                        <span className={locked ? 'lock-chip closed' : 'lock-chip open'}>
                          {locked ? 'Bloqueado' : `Cierra en ${formatCountdown(lockAt, now)}`}
                        </span>
                        <span className="lock-caption">
                          Cambios permitidos hasta 2 minutos antes
                        </span>
                      </div>

                      <div className="teams-row">
                        <div>
                          <strong>{match.home}</strong>
                          <small>{match.venue}</small>
                        </div>

                        <div className="score-inputs">
                          <label>
                            <span className="sr-only">Goles de {match.home}</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              disabled={locked}
                              value={activeEntry?.predictions?.[match.id]?.home ?? ''}
                              onChange={(event) =>
                                updatePrediction(match, 'home', event.target.value)
                              }
                            />
                          </label>
                          <span className="versus">:</span>
                          <label>
                            <span className="sr-only">Goles de {match.away}</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              disabled={locked}
                              value={activeEntry?.predictions?.[match.id]?.away ?? ''}
                              onChange={(event) =>
                                updatePrediction(match, 'away', event.target.value)
                              }
                            />
                          </label>
                        </div>

                        <div className="away-team">
                          <strong>{match.away}</strong>
                          <small>
                            {match.status === 'completed' && match.result
                              ? `Oficial: ${match.result.home}-${match.result.away}`
                              : reveal
                                ? 'Pronosticos revelados'
                                : match.details}
                          </small>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              <p className="fixtures-footnote">{activeCompetitionData.note}</p>
            </div>
          </div>
        )}

        {currentTab === 'table' && activeLeague && (
          <div className="tab-stack">
            <div className="glass-card summary-card">
              <span className="section-tag">Tu lugar</span>
              <h3>
                #{Math.max(1, leaderboard.findIndex((player) => player.userId === currentUser.id) + 1)}
              </h3>
              <div className="summary-metric">
                <strong>{myScore.total}</strong>
                <span>puntos totales</span>
              </div>
              <p>
                {myScore.matchPoints} por partidos cerrados y {myScore.bonusPoints} por extras.
              </p>
            </div>

            <div className="glass-card leaderboard-card">
              <div className="panel-header">
                <h3>Tabla de la polla</h3>
                <span className="muted-chip">En vivo</span>
              </div>
              <div className="leaderboard">
                {leaderboard.map((player, index) => (
                  <article key={player.userId} className="leader-row">
                    <div className="leader-position">#{index + 1}</div>
                    <div className="leader-name">
                      <strong>{player.name}</strong>
                      <span>
                        {player.matchPoints} por partidos · {player.bonusPoints} bonus
                      </span>
                    </div>
                    <div className="leader-points">{player.total} pts</div>
                    <div className="leader-trend positive">
                      {player.userId === currentUser.id ? 'Tu' : 'Live'}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'history' && activeLeague && (
          <div className="tab-stack">
            <div className="glass-card history-card">
              <div className="panel-header">
                <h3>Pronosticos revelados</h3>
                <span className="muted-chip">
                  {revealedMatches.length} partidos visibles
                </span>
              </div>

              {revealedRounds.length > 0 && (
                <div className="round-switcher">
                  {revealedRounds.map((round) => (
                    <button
                      key={round}
                      className={selectedHistoryRound === round ? 'round-chip active' : 'round-chip'}
                      onClick={() => setSelectedHistoryRound(round)}
                    >
                      {round}
                    </button>
                  ))}
                </div>
              )}

              {visibleHistoryMatches.length > 0 ? (
                <div className="history-stack">
                  {visibleHistoryMatches.map((match) => (
                    <article key={match.id} className="history-match">
                      <div className="match-meta">
                        <span>{match.round}</span>
                        <span>{match.kickoff}</span>
                      </div>
                      <h3>
                        {match.home} vs {match.away}
                      </h3>
                      <p className="fixtures-footnote">
                        {match.status === 'completed' && match.result
                          ? `Resultado oficial ${match.result.home}-${match.result.away}`
                          : 'Partido iniciado: pronosticos visibles, aun sin cierre oficial'}
                      </p>
                      <div className="history-picks">
                        {activeLeague.members.map((userId) => {
                          const user = users.find((item) => item.id === userId)
                          const entry = leagueEntries?.[activeLeague.id]?.[userId]
                          const prediction = entry?.predictions?.[match.id]
                          const points =
                            match.status === 'completed' && match.result
                              ? calculateMatchPoints(
                                  prediction,
                                  match.result,
                                  match.stageKey,
                                  activeLeague.scoring,
                                )
                              : 0

                          return (
                            <div key={`${match.id}-${userId}`} className="history-pick-row">
                              <strong>{user?.name || 'Participante'}</strong>
                              <span>
                                {prediction
                                  ? `${prediction.home}-${prediction.away}`
                                  : 'Sin pronostico'}
                              </span>
                              <small>{match.status === 'completed' ? `${points} pts` : 'En juego'}</small>
                            </div>
                          )
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="fixtures-footnote">
                  Aun no hay partidos visibles en esa fecha o los pronosticos siguen bloqueados.
                </p>
              )}
            </div>
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="tab-stack">
            <div className="glass-card invite-panel">
              <div className="panel-header">
                <h3>Invitaciones y acceso</h3>
                <span className="muted-chip">
                  {adminNotificationCount > 0 ? `${adminNotificationCount} solicitudes` : 'Sin alertas'}
                </span>
              </div>

              {latestInviteLeague ? (
                <div className="invite-card">
                  <p>
                    Liga: <strong>{latestInviteLeague.name}</strong>
                  </p>
                  <p>
                    Codigo de invitacion: <strong>{latestInviteLeague.inviteCode}</strong>
                  </p>
                  <div className="hero-actions compact">
                    <button
                      className="primary-btn"
                      onClick={() => copyInviteLink(latestInviteLeague)}
                    >
                      Copiar link de invitacion
                    </button>
                  </div>
                </div>
              ) : (
                <p>No administras ligas todavia.</p>
              )}

              <form
                className="join-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  requestJoinLeague(joinCode.trim().toUpperCase())
                }}
              >
                <label className="field">
                  <span>Ingresar por codigo</span>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                  />
                </label>
                <button className="secondary-btn full" type="submit">
                  Solicitar ingreso
                </button>
              </form>

              <p className="auth-message">{inviteFeedback || 'Las solicitudes llegan al admin.'}</p>
            </div>

            {activeLeague && (
              <div className="glass-card settings-card">
                <div className="panel-header">
                  <h3>Reglas de {activeLeague.name}</h3>
                  <span className="muted-chip">{isAdmin ? 'Administrador' : 'Solo lectura'}</span>
                </div>

                <div className="settings-grid">
                  <label className="field">
                    <span>Signo correcto</span>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={activeLeague.scoring.matchPoints.outcome}
                      onChange={(event) =>
                        updateScoring('matchPoints', 'outcome', event.target.value)
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Diferencia exacta</span>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={activeLeague.scoring.matchPoints.goalDiff}
                      onChange={(event) =>
                        updateScoring('matchPoints', 'goalDiff', event.target.value)
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Marcador exacto</span>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={activeLeague.scoring.matchPoints.exact}
                      onChange={(event) =>
                        updateScoring('matchPoints', 'exact', event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="settings-grid">
                  {stageDefinitions.map((stage) => (
                    <label key={stage.id} className="field">
                      <span>{stage.label}</span>
                      <input
                        type="number"
                        disabled={!isAdmin}
                        value={activeLeague.scoring.stagePoints[stage.id] || 0}
                        onChange={(event) =>
                          updateScoring('stagePoints', stage.id, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className="settings-grid">
                  {bonusFields.map((field) => (
                    <label key={field.id} className="field">
                      <span>{field.label}</span>
                      <input
                        type="number"
                        disabled={!isAdmin}
                        value={activeLeague.scoring.bonusPoints[field.id] || 0}
                        onChange={(event) =>
                          updateScoring('bonusPoints', field.id, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeLeague && (
              <div className="glass-card settings-card">
                <div className="panel-header">
                  <h3>Participantes de {activeLeague.name}</h3>
                  <span className="muted-chip">{activeLeague.members.length} jugadores</span>
                </div>

                <div className="request-list">
                  {activeLeague.members.map((userId) => {
                    const user = users.find((item) => item.id === userId)
                    const isSelf = userId === currentUser?.id
                    const isOwner = userId === activeLeague.ownerId

                    return (
                      <article key={userId} className="request-row">
                        <div>
                          <strong>{user?.name || 'Participante'}</strong>
                          <small>
                            {isOwner
                              ? 'Administrador'
                              : isSelf
                                ? 'Tu cuenta'
                                : user?.email || 'Jugador de la liga'}
                          </small>
                        </div>
                        {isAdmin ? (
                          <div className="request-actions">
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() =>
                                setSelectedBonusViewerId((current) =>
                                  current === userId ? '' : userId,
                                )
                              }
                            >
                              {selectedBonusViewerId === userId
                                ? 'Ocultar picks extra'
                                : 'Ver picks extra'}
                            </button>
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() =>
                                toggleBonusPermission(
                                  userId,
                                  !activeLeague.bonusEditOverrides?.[userId],
                                )
                              }
                            >
                              {activeLeague.bonusEditOverrides?.[userId]
                                ? 'Cerrar picks extra'
                                : 'Abrir picks extra'}
                            </button>
                            {!isOwner && (
                              <button
                                className="secondary-btn"
                                onClick={() => handleRemoveMember(userId)}
                              >
                                Botar de la liga
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="muted-chip">
                            {isOwner ? 'Owner' : isSelf ? 'Activo' : 'Miembro'}
                          </span>
                        )}
                      </article>
                    )
                  })}
                </div>
                {isAdmin && selectedBonusViewerId && (
                  <div className="bonus-viewer-card">
                    <div className="panel-header">
                      <h3>
                        Picks extra de{' '}
                        {users.find((item) => item.id === selectedBonusViewerId)?.name ||
                          'Participante'}
                      </h3>
                      <span className="muted-chip">
                        {activeLeague.bonusEditOverrides?.[selectedBonusViewerId]
                          ? 'Edicion habilitada'
                          : 'Edicion cerrada'}
                      </span>
                    </div>
                    <div className="bonus-viewer-grid">
                      {bonusFields.map((field) => (
                        <div key={field.id} className="bonus-viewer-item">
                          <span>{field.label}</span>
                          <strong>
                            {leagueEntries?.[activeLeague.id]?.[selectedBonusViewerId]?.bonusPicks?.[
                              field.id
                            ] || 'En blanco'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeLeague && isAdmin && (
              <div className="glass-card approvals-card">
                <div className="panel-header">
                  <h3>Solicitudes de ingreso</h3>
                  <span className="muted-chip">{pendingRequests.length} pendientes</span>
                </div>

                {pendingRequests.length > 0 ? (
                  <div className="request-list">
                    {pendingRequests.map((request) => {
                      const user = users.find((item) => item.id === request.userId)

                      return (
                        <article key={request.userId} className="request-row">
                          <div>
                            <strong>{user?.name || 'Participante'}</strong>
                            <small>{user?.email}</small>
                          </div>
                          <div className="request-actions">
                            <button
                              className="primary-btn"
                              type="button"
                              disabled={requestActionKey === `${request.userId}-approved`}
                              onClick={() => handleRequestDecision(request.userId, 'approved')}
                            >
                              {requestActionKey === `${request.userId}-approved`
                                ? 'Aprobando...'
                                : 'Aprobar'}
                            </button>
                            <button
                              className="secondary-btn"
                              type="button"
                              disabled={requestActionKey === `${request.userId}-blocked`}
                              onClick={() => handleRequestDecision(request.userId, 'blocked')}
                            >
                              {requestActionKey === `${request.userId}-blocked`
                                ? 'Bloqueando...'
                                : 'Bloquear'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="fixtures-footnote">
                    Cuando alguien intente entrar por link, te llegara aqui para aprobar o
                    bloquear.
                  </p>
                )}
                <p className="auth-message">{approvalFeedback || 'Aqui veras el resultado de aprobar o bloquear.'}</p>
              </div>
            )}

            {activeLeague && (
              <div className="glass-card settings-card">
                <div className="panel-header">
                  <h3>{isAdmin ? 'Administrar liga' : 'Tu participacion'}</h3>
                  <span className="muted-chip">{isAdmin ? 'Administrador' : 'Jugador'}</span>
                </div>
                <p className="fixtures-footnote">
                  {isAdmin
                    ? 'Si esta liga fue creada por error puedes borrarla por completo.'
                    : 'Si ya no quieres participar puedes abandonar la liga.'}
                </p>
                <div className="hero-actions compact">
                  {isAdmin ? (
                    <button className="secondary-btn danger-btn" onClick={handleDeleteLeague}>
                      Borrar liga
                    </button>
                  ) : (
                    <button className="secondary-btn danger-btn" onClick={handleLeaveLeague}>
                      Abandonar liga
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="bottom-tabs">
        {appTabs.map((tab) => (
          <button
            key={tab.id}
            className={currentTab === tab.id ? 'bottom-tab active' : 'bottom-tab'}
            onClick={() => setCurrentTab(tab.id)}
          >
            <span className="bottom-tab-icon">
              <TabIcon tabId={tab.id} active={currentTab === tab.id} />
            </span>
            <span className="bottom-tab-label">{tab.label}</span>
            {tab.id === 'settings' && adminNotificationCount > 0 && (
              <span className="tab-badge">{adminNotificationCount}</span>
            )}
          </button>
        ))}
      </nav>
    </main>
  )
}

export default App
