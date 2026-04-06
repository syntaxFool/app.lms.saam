import { z } from 'zod'

// ── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  uid: z.string().min(1, 'uid is required').max(100),
  password: z.string().min(1, 'password is required').max(200),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required').max(200),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(200),
})

// ── Users ────────────────────────────────────────────────────────────────────
const userRoles = ['superuser', 'admin', 'agent', 'user'] as const

export const createUserSchema = z.object({
  username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, underscores, dots and hyphens'),
  password: z.string().min(6).max(200),
  name: z.string().min(1).max(100).optional(),
  mobile: z.string().max(30).optional().or(z.literal('')),
  role: z.enum(userRoles).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  mobile: z.string().max(30).optional().or(z.literal('')),
  role: z.enum(userRoles).optional(),
  password: z.string().min(6).max(200).optional(),
})

export const updateOwnProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  mobile: z.string().max(30).optional().or(z.literal('')),
})

// ── Leads ────────────────────────────────────────────────────────────────────
const leadStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const
const temperatures = ['hot', 'warm', 'cold', ''] as const

export const createLeadSchema = z.object({
  name: z.string().max(200).optional().or(z.literal('')),
  phone: z.string().min(1).max(50),
  email: z.string().email().optional().or(z.literal('')),
  location: z.string().max(200).optional(),
  interest: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  status: z.enum(leadStatuses).optional(),
  assignedTo: z.string().max(100).optional(),
  temperature: z.enum(temperatures).optional(),
  value: z.number().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
  followUpDate: z.string().optional(),
})

export const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string().optional(),
  lostReason: z.string().max(500).optional(),
  lostReasonType: z.string().max(100).optional(),
})

export const bulkLeadUpdateSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  updates: z.object({
    assignedTo: z.string().max(100).optional(),
  }),
})

export const bulkLeadDeleteSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
})

// ── Activities ───────────────────────────────────────────────────────────────
export const createActivitySchema = z.object({
  type: z.string().min(1).max(100),
  note: z.string().min(1).max(5000),
  createdBy: z.string().max(100).optional(),
  role: z.string().max(50).optional(),
  relatedTaskId: z.string().optional(),
  changes: z.record(z.string(), z.unknown()).optional(),
})

// ── Tasks ────────────────────────────────────────────────────────────────────
const taskStatuses = ['pending', 'in-progress', 'completed'] as const
const priorities = ['low', 'medium', 'high'] as const

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  note: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(priorities).optional(),
  assignedTo: z.string().max(100).optional(),
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  completedAt: z.string().optional(),
})
