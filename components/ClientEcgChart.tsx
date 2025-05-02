// components/ClientEcgChart.tsx
"use client";

import dynamic from "next/dynamic";

const EcgChart = dynamic(() => import("@/components/EcgChart"), {
  ssr: false,
  loading: () => <div className="p-4 text-center">차트 로드 중...</div>,
});

interface ClientEcgChartProps {
  apiUrl: string;
}

export default function ClientEcgChart({ apiUrl }: ClientEcgChartProps) {
  return <EcgChart apiUrl={apiUrl} />;
}
