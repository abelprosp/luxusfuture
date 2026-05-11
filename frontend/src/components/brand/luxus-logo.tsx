export function LuxusLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" fillOpacity="0.15" />
      <path
        d="M14 32c0-6 2.5-10 8-14 3-2 6-3.5 8-6-1 4-3 7-6 9-2 1.5-4 2.5-6 3.5V32h-4z"
        fill="currentColor"
      />
      <path
        d="M28 16c4 2 6.5 5.5 6.5 10.5 0 3-1 5.5-2.5 7.5h-4c1.5-2 2-4 2-6.5 0-3.5-1.5-6-4-7.5l2-4z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      <path
        d="M18 14c2-1 4-1.5 6-1.5 1.5 0 3 .2 4.5.7l-1.2 2.8c-1-.3-2.1-.5-3.3-.5-2.4 0-4.6.8-6.5 2.2L18 14z"
        fill="currentColor"
        fillOpacity="0.6"
      />
    </svg>
  );
}
