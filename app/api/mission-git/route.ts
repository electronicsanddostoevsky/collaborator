import { ensureRepository, ancestry, exportRepository } from '@/db/mission-git';
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      mission = q.get('mission') || '';
    const repo = await ensureRepository(mission);
    if (q.get('download') === '1') {
      return new Response(await exportRepository(repo), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="mission.bundle"',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      });
    }
    return Response.json(
      {
        repository: repo,
        commits: await ancestry(repo.head),
        signedIn:
          !!req.headers.get('oai-authenticated-user-id') &&
          !!req.headers.get('oai-authenticated-user-email'),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message : 'Repository could not be loaded.',
      },
      { status: 503 },
    );
  }
}
