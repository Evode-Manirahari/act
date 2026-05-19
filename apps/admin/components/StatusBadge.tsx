interface Props {
  value: string;
}

const TONE: Record<string, string> = {
  proposed: '',
  approved: 'success',
  rejected: 'error',
  needs_more_info: 'warn',
  draft: '',
  published: 'success',
  archived: '',
  ready: 'success',
  pending: '',
  uploading: 'warn',
  uploaded: 'warn',
  processing: 'warn',
  failed: 'error',
};

export default function StatusBadge({ value }: Props) {
  const tone = TONE[value] ?? '';
  return <span className={`pill ${tone}`}>{value.replace(/_/g, ' ')}</span>;
}
