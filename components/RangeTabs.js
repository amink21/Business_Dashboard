import SegmentedTabs from './SegmentedTabs';
import { RANGES } from '../lib/data';

// All time / 90 days / 30 days - the one range control, shared by Home and
// Stats so switching pages doesn't reset what window you were looking at.
export default function RangeTabs({ value, onChange }) {
  return <SegmentedTabs options={RANGES} value={value} onChange={onChange} ariaLabel="Date range" />;
}
