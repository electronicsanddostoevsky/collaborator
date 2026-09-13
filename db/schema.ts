import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const contributorRuns = sqliteTable(
  'contributor_runs',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    userId: text('user_id').notNull(),
    author: text('author').notNull(),
    taskId: text('task_id'),
    taskRevision: integer('task_revision'),
    tool: text('tool').notNull(),
    model: text('model').notNull(),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_contributor_run_mission').on(t.mission, t.createdAt),
    index('idx_contributor_run_user').on(t.userId, t.status, t.createdAt),
  ],
);
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

export const missionPosts = sqliteTable(
  'mission_posts',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    userId: text('user_id').notNull(),
    author: text('author').notNull(),
    kind: text('kind').notNull(),
    body: text('body').notNull(),
    parentId: text('parent_id'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('idx_posts_mission_created').on(t.mission, t.createdAt)],
);

export const missionActions = sqliteTable(
  'mission_actions',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    creatorId: text('creator_id').notNull(),
    title: text('title').notNull(),
    brief: text('brief').notNull(),
    doneWhen: text('done_when').notNull(),
    kind: text('kind').notNull(),
    effort: text('effort').notNull(),
    status: text('status').notNull().default('open'),
    assigneeId: text('assignee_id'),
    assigneeName: text('assignee_name'),
    revision: integer('revision').notNull().default(1),
    lastEvent: text('last_event').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_actions_mission_status').on(t.mission, t.status),
    index('idx_actions_assignee').on(t.assigneeId),
  ],
);
export const actionEvents = sqliteTable(
  'action_events',
  {
    id: text('id').primaryKey(),
    actionId: text('action_id').notNull(),
    userId: text('user_id').notNull(),
    author: text('author').notNull(),
    kind: text('kind').notNull(),
    body: text('body').notNull(),
    url: text('url').notNull(),
    revision: integer('revision').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('idx_action_events_revision').on(t.actionId, t.revision)],
);
export const missionRevisions = sqliteTable(
  'mission_revisions',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    revision: integer('revision').notNull(),
    author: text('author').notNull(),
    message: text('message').notNull(),
    snapshot: text('snapshot').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_mission_revisions_number').on(t.mission, t.revision),
  ],
);
export const missionRepositories = sqliteTable('mission_repositories', {
  mission: text('mission').primaryKey(),
  head: text('head').notNull(),
  forkPolicy: text('fork_policy').notNull(),
  upstream: text('upstream'),
  forkBase: text('fork_base'),
});
export const gitCommits = sqliteTable('git_commits', {
  oid: text('oid').primaryKey(),
  parent: text('parent'),
  mergeParent: text('merge_parent'),
  mission: text('mission').notNull(),
  author: text('author').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
  depth: integer('depth').notNull(),
});
export const missionFollows = sqliteTable(
  'mission_follows',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    userId: text('user_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_mission_follows_membership').on(t.mission, t.userId),
    index('idx_mission_follows_user').on(t.userId),
  ],
);
export const workspaceWrites = sqliteTable('workspace_writes', {
  id: text('id').primaryKey(),
  mission: text('mission').notNull(),
  userId: text('user_id').notNull(),
  head: text('head').notNull(),
});
export const mergeRequests = sqliteTable(
  'merge_requests',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    target: text('target').notNull(),
    base: text('base').notNull(),
    sourceHead: text('source_head').notNull(),
    targetHead: text('target_head').notNull(),
    userId: text('user_id').notNull(),
    author: text('author').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: text('status').notNull().default('pending'),
    feedback: text('feedback').notNull().default(''),
    resolutions: text('resolutions').notNull().default('{}'),
    reviewer: text('reviewer'),
    mergeHead: text('merge_head'),
    createdAt: text('created_at').notNull(),
    reviewedAt: text('reviewed_at'),
  },
  (t) => [
    index('idx_merge_target_status').on(t.target, t.status),
    index('idx_merge_source').on(t.source),
  ],
);
export const workshopArtifacts = sqliteTable(
  'workshop_artifacts',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    userId: text('user_id').notNull(),
    author: text('author').notNull(),
    prompt: text('prompt').notNull(),
    model: text('model').notNull(),
    objectKey: text('object_key').notNull(),
    size: integer('size').notNull(),
    sha256: text('sha256').notNull(),
    status: text('status').notNull().default('uploading'),
    feedback: text('feedback').notNull().default(''),
    reviewer: text('reviewer'),
    reviewedAt: text('reviewed_at'),
    previewKey: text('preview_key'),
    actionId: text('action_id'),
    actionRevision: integer('action_revision'),
    inputHead: text('input_head'),
    tool: text('tool'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('idx_workshop_mission').on(t.mission),
    index('idx_workshop_user').on(t.userId),
  ],
);
export const missionToolsets = sqliteTable('mission_toolsets', {
  mission: text('mission').primaryKey(),
  requirements: text('requirements').notNull(),
  revision: integer('revision').notNull(),
});
export const missionPlans = sqliteTable('mission_plans', {
  id: text('id').primaryKey(),
  mission: text('mission').notNull(),
  userId: text('user_id').notNull(),
  author: text('author').notNull(),
  brief: text('brief').notNull(),
  model: text('model').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(),
  revision: integer('revision').notNull(),
  feedback: text('feedback').notNull(),
  reviewer: text('reviewer'),
  head: text('head'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const plannedTasks = sqliteTable('planned_tasks', {
  actionId: text('action_id').primaryKey(),
  planId: text('plan_id').notNull(),
  taskKey: text('task_key').notNull(),
  module: text('module').notNull(),
  dependencies: text('dependencies').notNull(),
});
export const missionMembers = sqliteTable(
  'mission_members',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    active: integer('active').notNull(),
    joinedAt: text('joined_at').notNull(),
  },
  (t) => [uniqueIndex('idx_member_account').on(t.mission, t.userId)],
);
export const missionLeads = sqliteTable(
  'mission_leads',
  {
    id: text('id').primaryKey(),
    mission: text('mission').notNull(),
    module: text('module').notNull(),
    memberId: text('member_id'),
    revision: integer('revision').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('idx_lead_module').on(t.mission, t.module)],
);
