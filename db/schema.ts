import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const claims = sqliteTable('claims', {
  taskId: text('task_id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});
export const proposals = sqliteTable(
  'proposals',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    url: text('url').notNull(),
    status: text('status').notNull().default('pending'),
    feedback: text('feedback').notNull().default(''),
    reviewer: text('reviewer'),
    createdAt: text('created_at').notNull(),
    reviewedAt: text('reviewed_at'),
    revision: integer('revision'),
    artifactId: text('artifact_id'),
    parentId: text('parent_id'),
  },
  (t) => [
    index('idx_proposals_task_status').on(t.taskId, t.status),
    uniqueIndex('idx_proposals_revision').on(t.revision),
  ],
);
export const follows = sqliteTable('follows', {
  userId: text('user_id').primaryKey(),
  createdAt: text('created_at').notNull(),
});

export const artifacts = sqliteTable(
  'artifacts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    taskId: text('task_id').notNull(),
    filename: text('filename').notNull(),
    size: integer('size').notNull(),
    sha256: text('sha256').notNull(),
    objectKey: text('object_key').notNull(),
    ready: integer('ready').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('idx_artifacts_user').on(t.userId)],
);

export const participation = sqliteTable(
  'participation',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').notNull(),
    note: text('note').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_participation_mission_user').on(t.mission, t.userId),
  ],
);

export const communityMissions = sqliteTable(
  'community_missions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    outcome: text('outcome').notNull(),
    roles: text('roles').notNull(),
    steps: text('steps').notNull(),
    intent: text('intent').notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_missions_owner').on(t.ownerId),
    index('idx_missions_created').on(t.createdAt),
  ],
);
