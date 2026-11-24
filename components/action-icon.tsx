const paths = {
  id: "M3 5h18v14H3z M7 9h4v6H7z M14 10h4m-4 4h4",
  upload: "M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5",
  download: "M12 4v12m-4-4 4 4 4-4M4 16v4h16v-4",
  edit: "m4 16-1 5 5-1L20 8l-4-4z M14 6l4 4",
  trophy:
    "M7 4h10v6a5 5 0 0 1-10 0V4ZM7 6H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4m-5 3v5m-4 0h8",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-2-11a4 4 0 0 1 0 8M13 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  external: "M13 5h6v6m0-6-8 8m7 0v6H5V6h6",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1 5 5 5",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-1v5m0-9h.01",
  star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9z",
  layers: "m3 8 9-5 9 5-9 5z m0 4 9 5 9-5m-18 4 9 5 9-5",
  element: "m12 2 8 10-8 10-8-10z m-4 10 4 5 4-5-4-5z",
  archive: "M4 7h16v13H4z M3 4h18v3H3z m6 7h6",
  clipboard: "M9 5H5v16h14V5h-4 M9 3h6v4H9z m0 9h6m-6 4h6",
  retry: "M4 11a8 8 0 1 1 2 6M4 5v6h6",
  save: "M4 4h13l3 3v13H4z M8 4v5h8V4 M8 20v-7h8v7",
  compare: "M4 4v16h16M8 16v-4m5 4V8m5 8V5",
  settings: "M4 6h16M4 12h16M4 18h16 M9 3v6m6 0v6m-6 0v6",
} as const;

export function ActionIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      className="action-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
