import type { Metadata } from 'next';

import { ViewerPage, viewerMetadata } from '../viewer-page';

type Props = { params: Promise<{ projectId: string; imageId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, imageId } = await params;
  return viewerMetadata(projectId, imageId);
}

export default async function ImageViewerPage({ params }: Props) {
  const { projectId, imageId } = await params;
  return <ViewerPage projectId={projectId} imageId={imageId} />;
}
