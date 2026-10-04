/** 툴바·컨트롤용 선 아이콘. 색은 currentColor 를 따른다 */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function SelectIcon() {
  return (
    <svg {...base}>
      <path d="M5 3.5 18.5 11l-6 1.6-2.7 6-4.8-15.1Z" />
    </svg>
  )
}

export function HandIcon() {
  return (
    <svg {...base}>
      <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.6-2.2L2.8 16a1.6 1.6 0 0 1 2.4-2.1L8 16.5V9a1.5 1.5 0 0 1 3 0" />
    </svg>
  )
}

export function FitIcon() {
  return (
    <svg {...base}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
    </svg>
  )
}

export function MinusIcon() {
  return (
    <svg {...base}>
      <path d="M5 12h14" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
