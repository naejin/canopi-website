/** @jsxImportSource preact */
// Search (stream S3; design check A8): Start's "Start empty and search". The Add sheet in search
// mode: every plant of the climate's list, found by folded names (A6), and the other climates' matches
// with "Add anyway". Loaded on first use (Details.tsx).
import Add from './Add.tsx';

export default function Search() {
  return <Add mode="search" />;
}
