import { database } from '@/db/client';
// Capture the record that actually won the optimistic update, in the same D1 transaction.
export function snapshotStatement(
  mission: string,
  revision: number,
  stamp: string,
  author: string,
  message: string,
) {
  return database()
    .prepare(
      `INSERT OR IGNORE INTO mission_revisions (id,mission,revision,author,message,snapshot,created_at) SELECT id||':'||revision,id,revision,?,?,json_object('title',title,'category',category,'description',description,'outcome',outcome,'roles',json(roles),'steps',json(steps),'intent',intent),updated_at FROM community_missions WHERE id=? AND revision=? AND updated_at=?`,
    )
    .bind(author, message, mission, revision, stamp);
}
