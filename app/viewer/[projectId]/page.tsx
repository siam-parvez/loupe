import type { Metadata } from 'next';

import { ViewerPage, viewerMetadata } from './viewer-page';

type Props = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  return viewerMetadata(projectId);
}

export default async function ProjectViewerPage({ params }: Props) {
  const { projectId } = await params;
  return <ViewerPage projectId={projectId} />;
}
