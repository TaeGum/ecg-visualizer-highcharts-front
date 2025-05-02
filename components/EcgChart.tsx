"use client";

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "highcharts/highcharts-more";
import "highcharts/modules/annotations";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface EcgDataPoint {
  time: number;
  amplitude: number;
}

interface EcgApiResponse {
  lead: string;
  sample_rate: number;
  data: EcgDataPoint[];
}

interface EcgChartProps {
  apiUrl: string;
}

export default function EcgChart({ apiUrl }: EcgChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const [annotations, setAnnotations] = useState<
    Highcharts.AnnotationsOptions[]
  >([]);

  // ECG 데이터 패칭
  const { data, isLoading, error } = useQuery<EcgApiResponse>({
    queryKey: ["ecg", apiUrl],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("데이터 로딩 실패");
      return res.json();
    },
  });

  // 어노테이션 추가 함수
  const addAnnotation = (xMin: number, xMax: number) => {
    const minY = data ? Math.min(...data.data.map((p) => p.amplitude)) : -2;
    const maxY = data ? Math.max(...data.data.map((p) => p.amplitude)) : 2;
    const newAnnotation: Highcharts.AnnotationsOptions = {
      id: `annotation-${Date.now()}`,
      draggable: "x",
      shapes: [
        {
          type: "rect",
          point: { x: xMin, y: minY, xAxis: 0, yAxis: 0 },
          width: xMax - xMin,
          height: maxY - minY,
          fill: "rgba(0,128,255,0.2)",
          stroke: "blue",
          strokeWidth: 2,
        },
      ],
      labels: [
        {
          point: { x: xMin, y: maxY, xAxis: 0, yAxis: 0 },
          text: `구간 (${xMin.toFixed(2)}s ~ ${xMax.toFixed(2)}s)`,
          backgroundColor: "rgba(0,128,255,0.1)",
          borderColor: "blue",
          style: { color: "blue", fontWeight: "bold" },
        },
      ],
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  // 차트 옵션
  const chartOptions: Highcharts.Options = {
    chart: {
      type: "line",
      zoomType: "x", // 반드시 'x'로 설정해야 selection 이벤트가 동작함
      height: 500,
      events: {
        selection: function (event) {
          if (!event.xAxis || !event.xAxis[0]) return false;
          const [xMin, xMax] = [event.xAxis[0].min, event.xAxis[0].max];
          // 어노테이션 추가
          addAnnotation(xMin, xMax);
          return false; // 기본 줌 동작 방지
        },
      },
    },
    title: { text: "ECG 신호 시각화" },
    xAxis: {
      title: { text: "시간 (초)" },
      min: data?.data[0]?.time || 0,
      max: data?.data[data.data.length - 1]?.time || 10,
      crosshair: true,
      labels: { format: "{value:.2f}s" },
    },
    yAxis: {
      title: { text: "진폭 (mV)" },
      labels: { format: "{value}mV" },
      plotLines: [
        {
          value: 0,
          color: "#FF0000",
          width: 2,
          zIndex: 5,
        },
      ],
    },
    series: [
      {
        name: data?.lead || "ECG",
        type: "line",
        data: data?.data.map((p) => [p.time, p.amplitude]) || [],
        tooltip: {
          headerFormat: "<b>{series.name}</b><br>",
          pointFormat: "시간: {point.x:.3f}s<br>진폭: {point.y:.3f}mV",
        },
        marker: { enabled: false },
      },
    ],
    annotations: annotations,
    plotOptions: {
      series: {
        turboThreshold: 5000, // 대량 데이터 허용
      },
    },
    credits: { enabled: false },
  };

  if (isLoading)
    return <div className="p-4 text-center">데이터 로딩 중...</div>;
  if (error)
    return (
      <div className="p-4 text-red-500">오류: {(error as Error).message}</div>
    );

  return (
    <div className="p-4 border rounded-lg shadow-lg">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        ref={chartRef}
      />
      <p className="mt-2 text-sm text-gray-500">
        차트에서 마우스로 드래그하여 구간 어노테이션을 추가할 수 있습니다.
      </p>
    </div>
  );
}
