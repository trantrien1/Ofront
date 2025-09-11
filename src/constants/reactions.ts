// Unified reaction scale used by posts & comments
// Order kept to match existing PostItem UX
import { FaThumbsUp, FaHeart, FaGrinHearts, FaSadTear, FaAngry } from 'react-icons/fa';

export const REACTIONS = [
  { lv: 1, label: 'Đồng ý', icon: FaThumbsUp, color: 'blue.500' },
  { lv: 2, label: 'Đồng ý hoàn toàn', icon: FaHeart, color: 'red.500' },
  { lv: 3, label: 'Đồng ý bình thường', icon: FaGrinHearts, color: 'pink.400' },
  { lv: 4, label: 'Không đồng ý', icon: FaSadTear, color: 'yellow.500' },
  { lv: 5, label: 'Hoàn toàn không đồng ý', icon: FaAngry, color: 'orange.500' },
] as const;

export type ReactionDef = typeof REACTIONS[number];

export const findReaction = (lv?: number) => REACTIONS.find(r => r.lv === lv);
