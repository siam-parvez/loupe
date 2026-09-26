import { StatusPage } from '@/components/StatusPage';

export default function NotFound() {
  return (
    <StatusPage
      title="Artwork not found"
      message="This link doesn't point to any artwork. Please check the address, or ask for a new link."
    />
  );
}
