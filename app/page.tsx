import Link from 'next/link';

import { StatusPage } from '@/components/StatusPage';
import { BRAND } from '@/lib/brand';
import { listProjects } from '@/lib/projects/repository';

/**
 * Development index of local projects. In production this page lists nothing, so client
 * projects are only reachable through the direct link you send them.
 */
export default async function HomePage() {
  const isDev = process.env.NODE_ENV !== 'production';
  const projects = isDev ? await listProjects() : [];

  if (projects.length === 0) {
    return (
      <StatusPage
        title={BRAND.productCredit}
        message={
          isDev ? (
            <>
              No projects yet. Run{' '}
              <code className="text-ink">pnpm viewer:prepare ./artwork.png</code>
            </>
          ) : (
            'Please use the link you were sent to view your artwork.'
          )
        }
      />
    );
  }

  return (
    <StatusPage eyebrow="Development" title="Projects" message="Local projects in ./projects">
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line text-left">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/viewer/${project.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.03]"
            >
              <span className="text-sm text-ink">{project.title}</span>
              <span className="font-mono text-xs text-muted">
                {project.images.length} image{project.images.length === 1 ? '' : 's'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </StatusPage>
  );
}
