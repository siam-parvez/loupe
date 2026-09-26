import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArtworkViewer } from '@/components/image-viewer/ArtworkViewer';
import { StatusPage } from '@/components/StatusPage';
import { getProject, getViewerPayload } from '@/lib/projects/repository';

/** Shared by `/viewer/[projectId]` (first image) and `/viewer/[projectId]/[imageId]`. */
export async function ViewerPage({ projectId, imageId }: { projectId: string; imageId?: string }) {
  const result = await getViewerPayload(projectId, imageId);

  if (result.kind === 'not-found') notFound();
  if (result.kind === 'empty') {
    return (
      <StatusPage
        eyebrow={result.project.title}
        title="No artwork yet"
        message="Artwork for this project hasn't been uploaded yet. Please check back soon."
      />
    );
  }
  return <ArtworkViewer payload={result.payload} />;
}

export async function viewerMetadata(projectId: string, imageId?: string): Promise<Metadata> {
  const project = await getProject(projectId).catch(() => null);
  if (!project) return { title: 'Artwork not found' };
  const image = imageId ? project.images.find((entry) => entry.id === imageId) : project.images[0];
  return {
    title:
      image && image.title !== project.title ? `${image.title} — ${project.title}` : project.title,
    description: image?.description ?? project.description,
  };
}
