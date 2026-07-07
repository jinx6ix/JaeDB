// lib/agents/permissions.ts
// The enforced version of the "employee" permission matrix:
//   👁️ read · ✍️ write · 🛑 delete · 📢 notify · 🤝 request-other-ai · 👤 ask-user
//
// This is consulted by orchestrator.ts before every ctx.notify / ctx.requestAgent /
// ctx.requireConfirmation call, and by any agent that writes to the DB should
// check canWrite/canDelete before doing so. It is the single source of truth —
// change an agent's job description here, not by editing its code.

import type { AgentName } from './types';

export interface AgentPermissions {
  title: string;
  department: string;
  /** Human manager/agent this one escalates to. */
  reportsTo: AgentName | 'human';
  canRead: string[];        // entities/tables this agent may query
  canWrite: string[];       // entities/tables this agent may create/update
  canDelete: boolean;       // never true today, on purpose — see README note below
  canNotify: boolean;
  canRequestAgent: AgentName[]; // which agents this one may hand off to directly
  /** Actions that must go through requireConfirmation() before taking effect. */
  requiresConfirmationFor: string[];
}

// NOTE ON canDelete: no agent in this system is granted delete rights. If you
// ever want to change that for a specific agent, do it here explicitly and
// add a matching requiresConfirmationFor entry — never let an agent delete
// silently.

export const AGENT_PERMISSIONS: Record<AgentName, AgentPermissions> = {
  orchestrator: {
    title: 'Pipeline Coordinator', department: 'Operations', reportsTo: 'human',
    canRead: ['*'], canWrite: [], canDelete: false, canNotify: false,
    canRequestAgent: ['analyst', 'cost-sheet', 'itinerary', 'invoice', 'rate-intel', 'itinerary-gen', 'monitor', 'booking-coordinator', 'voucher-clerk', 'accessibility', 'user-steward'],
    requiresConfirmationFor: [],
  },
  ui: {
    title: 'Human Operator', department: 'N/A', reportsTo: 'human',
    canRead: ['*'], canWrite: ['*'], canDelete: true, canNotify: true,
    canRequestAgent: [], requiresConfirmationFor: [],
  },
  analyst: {
    title: 'Read-Only Analyst', department: 'Finance & Ops', reportsTo: 'orchestrator',
    canRead: ['*'], canWrite: [], canDelete: false, canNotify: false,
    canRequestAgent: [], requiresConfirmationFor: [],
  },
  'cost-sheet': {
    title: 'Costing Specialist', department: 'Sales & Costing', reportsTo: 'orchestrator',
    canRead: ['booking', 'srHotel', 'srRoomType', 'srRoomPrice', 'tourPackage'],
    canWrite: ['costSheet (draft only)'], canDelete: false, canNotify: false,
    canRequestAgent: [], requiresConfirmationFor: [],
  },
  itinerary: {
    title: 'Itinerary Writer', department: 'Guest Services', reportsTo: 'orchestrator',
    canRead: ['booking', 'costSheet', 'tourPackage', 'tourDay'],
    canWrite: ['itinerary (draft only)'], canDelete: false, canNotify: false,
    canRequestAgent: [], requiresConfirmationFor: [],
  },
  invoice: {
    title: 'Invoice Auditor', department: 'Finance', reportsTo: 'orchestrator',
    canRead: ['invoice', 'costSheet'], canWrite: [], canDelete: false, canNotify: false,
    canRequestAgent: [], requiresConfirmationFor: [],
  },
  'rate-intel': {
    title: 'Rate Intelligence Analyst', department: 'Contracting', reportsTo: 'orchestrator',
    canRead: ['srHotel', 'srRoomType', 'srSeason', 'srRoomPrice', 'srCounty'],
    canWrite: [], canDelete: false, canNotify: false,
    canRequestAgent: [], requiresConfirmationFor: [],
  },
  'itinerary-gen': {
    title: 'Itinerary Generator (external sources)', department: 'Guest Services', reportsTo: 'orchestrator',
    canRead: ['booking'], canWrite: ['itinerary', 'itineraryDay'], canDelete: false, canNotify: false,
    canRequestAgent: [], requiresConfirmationFor: [],
  },
  monitor: {
    title: 'Systems Monitor', department: 'IT / Admin', reportsTo: 'orchestrator',
    canRead: ['agentRun', 'agentMessage', 'log', 'user'], canWrite: [], canDelete: false,
    canNotify: true, canRequestAgent: ['user-steward'], requiresConfirmationFor: [],
  },
  'booking-coordinator': {
    title: 'Booking Coordinator', department: 'Operations', reportsTo: 'orchestrator',
    canRead: ['booking', 'client', 'tourPackage'],
    canWrite: ['booking.status', 'booking.notes'], canDelete: false,
    canNotify: true, canRequestAgent: ['voucher-clerk', 'accessibility'],
    requiresConfirmationFor: ['booking.status -> CANCELLED', 'booking.status -> COMPLETED'],
  },
  'voucher-clerk': {
    title: 'Voucher & Guest Communications Clerk', department: 'Guest Services', reportsTo: 'orchestrator',
    canRead: ['booking', 'client', 'property', 'vehicle', 'voucher'],
    canWrite: ['voucher (draft)'], canDelete: false,
    canNotify: true, canRequestAgent: ['accessibility', 'booking-coordinator', 'analyst'],
    requiresConfirmationFor: ['send-email'],
  },
  accessibility: {
    title: 'Accessibility Compliance Officer', department: 'Guest Services / Brand', reportsTo: 'orchestrator',
    canRead: ['booking', 'vehicle', 'property', 'voucher'],
    canWrite: [], canDelete: false,
    canNotify: true, canRequestAgent: ['voucher-clerk', 'booking-coordinator'],
    requiresConfirmationFor: ['block-voucher-send'],
  },
  'user-steward': {
    title: 'User & Access Steward', department: 'Admin / Security', reportsTo: 'orchestrator',
    canRead: ['user', 'log'], canWrite: [], canDelete: false,
    canNotify: true, canRequestAgent: ['monitor'],
    requiresConfirmationFor: ['flag-account', 'suggest-deactivation'],
  },
};

export class PermissionError extends Error {
  constructor(agent: AgentName, capability: string) {
    super(`Permission denied: '${agent}' is not authorized to ${capability}. Edit lib/agents/permissions.ts to grant it.`);
    this.name = 'PermissionError';
  }
}

export function assertCanNotify(agent: AgentName) {
  if (!AGENT_PERMISSIONS[agent]?.canNotify) throw new PermissionError(agent, 'send notifications');
}

export function assertCanRequestAgent(agent: AgentName, target: AgentName) {
  const perms = AGENT_PERMISSIONS[agent];
  if (!perms?.canRequestAgent.includes(target)) {
    throw new PermissionError(agent, `request the '${target}' agent`);
  }
}

export function requiresConfirmation(agent: AgentName, action: string): boolean {
  return AGENT_PERMISSIONS[agent]?.requiresConfirmationFor.includes(action) ?? false;
}
