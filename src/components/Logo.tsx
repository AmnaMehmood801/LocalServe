import type { SVGProps } from "react";

type LogoProps = Pick<SVGProps<SVGSVGElement>, "className">;

export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={36}
      height={36}
      aria-hidden="true"
      className={className}
    >
      <rect width="64" height="64" rx="16" fill="#1DBF73" />
      <path
        d="M11 32L32 13L53 32"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 30V51H46V30"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 38L31 43L40 33"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
