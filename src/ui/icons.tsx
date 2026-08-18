import type { SVGProps } from "react";

function Ico(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function IconPlay() {
  return (
    <Ico>
      <path d="M9 6.8v10.4c0 .9 1 1.4 1.7.9l8-5.2c.7-.45.7-1.35 0-1.8l-8-5.2c-.7-.5-1.7 0-1.7.9z" fill="currentColor" stroke="none" />
    </Ico>
  );
}

export function IconPause() {
  return (
    <Ico>
      <rect x="7" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none" />
      <rect x="13" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none" />
    </Ico>
  );
}

export function IconPrev() {
  return (
    <Ico>
      <path d="M18 6v12l-8-6zM6 6v12" />
    </Ico>
  );
}

export function IconNext() {
  return (
    <Ico>
      <path d="M6 6v12l8-6zM18 6v12" />
    </Ico>
  );
}

export function IconFolder() {
  return (
    <Ico>
      <path d="M4 8.2c0-.66.54-1.2 1.2-1.2H9l1.6 1.7h8.2c.66 0 1.2.54 1.2 1.2v7.1c0 .66-.54 1.2-1.2 1.2H5.2c-.66 0-1.2-.54-1.2-1.2z" />
    </Ico>
  );
}

export function IconMic() {
  return (
    <Ico>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
    </Ico>
  );
}

export function IconFull() {
  return (
    <Ico>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Ico>
  );
}

export function IconGrid() {
  return (
    <Ico>
      <rect x="4" y="4" width="6" height="6" rx="1.6" />
      <rect x="14" y="4" width="6" height="6" rx="1.6" />
      <rect x="4" y="14" width="6" height="6" rx="1.6" />
      <rect x="14" y="14" width="6" height="6" rx="1.6" />
    </Ico>
  );
}
