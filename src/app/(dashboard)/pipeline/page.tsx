import PipelineClient from '@/components/pipeline/PipelineClient';

export const metadata = { title: 'Pipeline' };

export default function PipelinePage({
  searchParams,
}: {
  searchParams: {
    requirementId?: string;
    stageCode?: string;
    recruiterId?: string;
    clientId?: string;
  };
}) {
  return <PipelineClient initialFilters={searchParams} />;
}
