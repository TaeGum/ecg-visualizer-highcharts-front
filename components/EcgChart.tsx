/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "highcharts/highcharts-more";
import "highcharts/modules/xrange";
import "highcharts/modules/draggable-points";
import { v4 as uuidv4 } from "uuid";
import { useRegionStore } from "@/store/useRegionStore";

interface ChartWithCustomHandles extends Highcharts.Chart {
  customHandles?: any[];
}

type EcgChartProps = {
  ecgData?: any[];
  apiUrl?: string;
};

const MAJOR_TICK_COLOR = "#c7ced2";
const MINOR_TICK_COLOR = "#e6eaec";
const FONT_COLOR = "#8f979d";
const WIDTH = 900;
const HEIGHT = WIDTH * 0.12 + 15;
const LINE_WIDTH = 1;
const MIN_REGION_WIDTH = 50;

export default function EcgChart({ ecgData = [], apiUrl }: EcgChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const {
    regions,
    activeRegionId,
    addRegion,
    updateRegion,
    removeRegion,
    setActiveRegionId,
  } = useRegionStore();

  // 각 영역별 hover 상태를 객체로 관리
  const [hoveredRegions, setHoveredRegions] = useState<{
    [key: string]: boolean;
  }>({});

  // 편집 상태
  const [edit, setEdit] = useState<{
    label: string;
    memo: string;
    color: string;
  }>({
    label: "",
    memo: "",
    color: "#7c3aed",
  });

  // 영역 선택 시 편집 상태 초기화
  useEffect(() => {
    if (!activeRegionId) return;
    const region = regions.find((r) => r.id === activeRegionId);
    if (region) {
      setEdit({
        label: region.label || "",
        memo: region.memo || "",
        color: region.color || "#7c3aed",
      });
    }
  }, [activeRegionId, regions]);

  // 커스텀 핸들(세로 라인 + 본체 rect)
  useEffect(() => {
    if (!chartRef.current?.chart) return;
    const chart = chartRef.current.chart as ChartWithCustomHandles;
    chart.customHandles?.forEach((handle: any) => handle.destroy());
    chart.customHandles = [];

    regions.forEach((region) => {
      if (
        typeof region.start !== "number" ||
        typeof region.end !== "number" ||
        isNaN(region.start) ||
        isNaN(region.end)
      ) {
        return;
      }
      const renderer = chart.renderer;
      const startX = chart.xAxis[0].toPixels(region.start);
      const endX = chart.xAxis[0].toPixels(region.end);
      const top = chart.plotTop;
      const bottom = chart.plotTop + chart.plotHeight;

      if (isNaN(startX) || isNaN(endX)) return;

      // 차트 상태
      const isHovered = hoveredRegions[region.id] === true;
      const isActive = activeRegionId === region.id;

      // 왼쪽 끝 세로 라인 핸들 (리사이즈)
      const startHandle = renderer
        .path([
          "M",
          startX,
          top,
          "L",
          startX,
          bottom,
        ] as unknown as Highcharts.SVGPathArray)
        .attr({
          stroke: isActive ? "#1976d2" : isHovered ? "#1976d2" : "#666",
          "stroke-width": isHovered ? 3 : 1,
          cursor: "ew-resize",
          zIndex: 10,
          opacity: isHovered ? 0.9 : 0.5,
        })
        .on("mousedown", (e) => {
          e.stopPropagation();
          e.preventDefault();
          handleDragStart(e, region, "start");
        })
        .on("mouseover", () =>
          setHoveredRegions((prev) => ({ ...prev, [region.id]: true }))
        )
        .on("mouseout", () =>
          setHoveredRegions((prev) => ({ ...prev, [region.id]: false }))
        )
        .add();

      // 오른쪽 끝 세로 라인 핸들 (리사이즈)
      const endHandle = renderer
        .path([
          "M",
          endX,
          top,
          "L",
          endX,
          bottom,
        ] as unknown as Highcharts.SVGPathArray)
        .attr({
          stroke: isActive ? "#1976d2" : isHovered ? "#1976d2" : "#666",
          "stroke-width": isHovered ? 3 : 1,
          cursor: "ew-resize",
          zIndex: 10,
          opacity: isHovered ? 0.9 : 0.5,
        })
        .on("mousedown", (e) => {
          e.stopPropagation();
          e.preventDefault();
          handleDragStart(e, region, "end");
        })
        .on("mouseover", () =>
          setHoveredRegions((prev) => ({ ...prev, [region.id]: true }))
        )
        .on("mouseout", () =>
          setHoveredRegions((prev) => ({ ...prev, [region.id]: false }))
        )
        .add();

      // 본체(영역) 드래그 핸들 (이동)
      // const rectX = Math.min(startX, endX) + 8;
      // const rectW = Math.max(0, Math.abs(endX - startX) - 16);
      const rectX = Math.min(startX, endX);
      const rectW = Math.abs(endX - startX);
      if (!isNaN(rectX) && !isNaN(rectW) && rectW > 0) {
        const bodyRect = renderer
          .rect(rectX, top, rectW, bottom - top, 0)
          .attr({
            fill: isActive
              ? region.color || "rgba(25, 118, 210, 0.45)"
              : isHovered
              ? region.color.replace("0.35", "0.15") ||
                "rgba(25, 118, 210, 0.15)"
              : "rgba(0,0,0,0.001)",
            cursor: "move",
            zIndex: 15,
            "stroke-width": isHovered ? 2 : 0,
            // stroke: isHovered ? "#1976d2" : undefined,
          })
          .on("mousedown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleBodyDragStart(e, region);
          })
          .on("mouseover", () =>
            setHoveredRegions((prev) => ({ ...prev, [region.id]: true }))
          )
          .on("mouseout", () =>
            setHoveredRegions((prev) => ({ ...prev, [region.id]: false }))
          )
          .add();
        chart.customHandles.push(bodyRect);
      }
      chart.customHandles.push(startHandle, endHandle);
    });
  }, [regions, chartRef.current?.chart, hoveredRegions]);

  // 리사이즈 핸들 드래그
  const handleDragStart = (e: any, region: any, type: "start" | "end") => {
    e.stopPropagation();
    e.preventDefault();
    const chart = chartRef.current?.chart;
    if (!chart) return;
    setActiveRegionId(region.id);

    const normalizedStart = chart.pointer.normalize(e);
    const startX = normalizedStart.chartX;

    const mouseMoveHandler = (moveEvent: any) => {
      const normalizedEvent = chart.pointer.normalize(moveEvent);
      const newX = chart.xAxis[0].toValue(normalizedEvent.chartX);

      if (isNaN(newX)) return;

      updateRegion(region.id, (prev) => {
        let newStart = prev.start;
        let newEnd = prev.end;
        if (type === "start") {
          newStart = Math.min(newX, prev.end - MIN_REGION_WIDTH);
        } else {
          newEnd = Math.max(newX, prev.start + MIN_REGION_WIDTH);
        }
        if (
          newEnd - newStart < MIN_REGION_WIDTH ||
          isNaN(newStart) ||
          isNaN(newEnd) ||
          newStart >= newEnd
        ) {
          return prev;
        }
        return { ...prev, start: newStart, end: newEnd };
      });
    };

    const mouseUpHandler = () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  };

  // 본체(영역) 이동 드래그
  const handleBodyDragStart = (e: any, region: any) => {
    e.stopPropagation();
    e.preventDefault();
    const chart = chartRef.current?.chart;
    if (!chart) return;
    setActiveRegionId(region.id);

    const normalizedStart = chart.pointer.normalize(e);
    const startX = normalizedStart.chartX;

    const initialStart = region.start;
    const initialEnd = region.end;
    const regionWidth = initialEnd - initialStart;

    const mouseMoveHandler = (moveEvent: any) => {
      const normalizedEvent = chart.pointer.normalize(moveEvent);
      const deltaX = normalizedEvent.chartX - startX;
      const valuePerPixel =
        (chart.xAxis[0].max - chart.xAxis[0].min) / chart.xAxis[0].len;

      let newStart = initialStart + deltaX * valuePerPixel;
      let newEnd = newStart + regionWidth;

      // 차트 범위 제한
      if (newStart < chart.xAxis[0].min) {
        newStart = chart.xAxis[0].min;
        newEnd = newStart + regionWidth;
      }
      if (newEnd > chart.xAxis[0].max) {
        newEnd = chart.xAxis[0].max;
        newStart = newEnd - regionWidth;
      }
      if (
        newEnd - newStart < MIN_REGION_WIDTH ||
        isNaN(newStart) ||
        isNaN(newEnd) ||
        newStart >= newEnd
      ) {
        return;
      }

      updateRegion(region.id, (prev) => ({
        ...prev,
        start: newStart,
        end: newEnd,
      }));
    };

    const mouseUpHandler = () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  };

  // 드래그로 영역 생성 (줌 대신)
  const chartOptions: Highcharts.Options = {
    chart: {
      width: WIDTH,
      height: HEIGHT,
      margin: [LINE_WIDTH + 2, LINE_WIDTH, LINE_WIDTH + 15, LINE_WIDTH],
      style: { fontFamily: "NotoSansKR" },
      plotBorderColor: MAJOR_TICK_COLOR,
      plotBorderWidth: 0,
      // @ts-expect-error
      zoomType: "x",
      events: {
        selection: function (event) {
          if (!event.xAxis?.[0]) return false;
          const [xMin, xMax] = [event.xAxis[0].min, event.xAxis[0].max];
          if (xMax - xMin < MIN_REGION_WIDTH) return false;

          addRegion({
            id: uuidv4(),
            start: xMin,
            end: xMax,
            color: "rgba(128, 0, 128, 0.35)",
            label: "new region",
          });
          return false;
        },
        load: function () {
          const chart = this;
          const chartHeight = chart.chartHeight - 15;
          chart.renderer
            .path([
              "M",
              0,
              1 / 2 + 1 * 2,
              "H",
              chart.chartWidth,
              "M",
              0,
              chartHeight - 1 / 2,
              "H",
              chart.chartWidth,
              "M",
              1 / 2,
              1 * 2,
              "V",
              chartHeight,
              "M",
              chart.chartWidth - 1 / 2,
              1 * 2,
              "V",
              chartHeight,
              "Z",
            ] as unknown as Highcharts.SVGPathArray)
            .attr({
              "stroke-width": 1,
              stroke: MAJOR_TICK_COLOR,
              zIndex: 2,
            })
            .add();

          const yInterval = (chartHeight - 1 * 3) / 6;
          const minorYPath = [];
          for (let i = 1; i < 6; i++) {
            minorYPath.push(
              "M",
              0,
              1 / 2 + 1 * 2 + i * yInterval,
              "H",
              chart.chartWidth
            );
          }
          chart.renderer
            .path(minorYPath.concat("z"))
            .attr({
              "stroke-width": 1,
              stroke: MINOR_TICK_COLOR,
            })
            .add();

          const xInterval = (chart.chartWidth - 1) / 50;
          const minorXPath = [];
          const majorXPath = [];
          for (let i = 1; i < 50; i++) {
            if (i % 5 !== 0) {
              minorXPath.push(
                "M",
                1 / 2 + i * xInterval,
                1 * 2,
                "V",
                chartHeight
              );
            }
          }
          for (let i = 0; i < 51; i++) {
            if (i % 5 === 0) {
              majorXPath.push(
                "M",
                1 / 2 + i * xInterval,
                1 * 2,
                "V",
                chartHeight + 14
              );
            }
          }
          chart.renderer
            .path(minorXPath.concat("z"))
            .attr({
              "stroke-width": 1,
              stroke: MINOR_TICK_COLOR,
            })
            .add();
          chart.renderer
            .path(majorXPath.concat("z"))
            .attr({
              "stroke-width": 1,
              stroke: MAJOR_TICK_COLOR,
            })
            .add();

          chart.renderer.boxWrapper.attr({ preserveAspectRatio: "none" });
          chart.reflow();
        },
      },
    },
    boost: { useGPUTranslations: true },
    title: { text: "" },
    tooltip: { enabled: false },
    legend: { enabled: false },
    credits: { enabled: false },
    exporting: { enabled: false },
    xAxis: {
      minPadding: 0,
      max: 2500,
      tickPosition: "outside",
      tickmarkPlacement: "on",
      tickLength: 15,
      tickWidth: 0,
      tickColor: MAJOR_TICK_COLOR,
      tickInterval: 250,
      minorTickInterval: 50,
      minorTickColor: MINOR_TICK_COLOR,
      lineColor: MAJOR_TICK_COLOR,
      gridLineColor: MAJOR_TICK_COLOR,
      gridLineWidth: 0,
      minorGridLineWidth: 0,
      labels: {
        enabled: true,
        padding: 0,
        x: 9,
        y: 14,
        style: {
          fontSize: "11px",
          lineHeight: "13px",
          fill: FONT_COLOR,
          color: FONT_COLOR,
        },
        formatter: function () {
          return this.value !== 2500 ? `${Number(this.value) / 250}s` : "";
        },
      },
    },
    yAxis: [
      {
        min: -2,
        max: 2,
        tickmarkPlacement: "on",
        tickAmount: 7,
        tickColor: MINOR_TICK_COLOR,
        gridLineColor: MINOR_TICK_COLOR,
        gridLineWidth: 0,
        // @ts-expect-error
        title: { enabled: false },
        labels: { padding: 0, enabled: false },
      },
    ],
    series: [
      {
        type: "line",
        data:
          ecgData.length > 0
            ? ecgData
            : Array.from({ length: 2500 }, (_, i) => [
                i,
                Math.sin(i / 100) * 1.2 + Math.random() * 0.2,
              ]),
        lineWidth: 1,
        color: "#ff0000",
        pointPlacement: "on",
        zIndex: 2,
      },
      {
        type: "xrange",
        pointWidth: 100,
        borderColor: "transparent",
        cursor: "pointer",
        data: regions.map((region) => ({
          id: region.id,
          x:
            typeof region.start === "number" && !isNaN(region.start)
              ? region.start
              : 0,
          x2:
            typeof region.end === "number" && !isNaN(region.end)
              ? region.end
              : MIN_REGION_WIDTH,
          y: 0,
          color: region.color, // 즉시 반영!
          label: region.label,
        })),
        dataLabels: {
          enabled: true,
          useHTML: true,
          formatter: function () {
            return `<span style="
              background: #222;
              color: #fff;
              padding: 3px 8px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 13px;
            ">
            ${(this as any).point.label}
            </span>`;
          },
        },
        dragDrop: {
          draggableX: false,
          draggableX2: false,
          // @ts-expect-error
          draggable: false,
        },
        zIndex: 1,
      },
    ],
    plotOptions: {
      series: {
        animation: false,
        marker: { enabled: false },
      },
    },
  };

  return (
    <div className="w-[900px] mx-auto flex flex-col items-center">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        ref={chartRef}
      />

      {/* 차트 아래 넓은 영역 편집 패널 */}
      {activeRegionId && (
        <div className="w-full max-w-2xl mx-auto mt-4 bg-neutral-900/95 border border-neutral-700 rounded-lg shadow-lg p-6 flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-neutral-400 mb-1">
                이름
              </label>
              <input
                className="w-full bg-neutral-800 text-white rounded px-2 py-1"
                value={edit.label}
                onChange={(e) =>
                  setEdit((edit) => ({ ...edit, label: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                색상
              </label>
              <input
                type="color"
                className="w-10 h-10 rounded border-none"
                value={edit.color}
                onChange={(e) =>
                  setEdit((edit) => ({ ...edit, color: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">
              설명/메모
            </label>
            <textarea
              className="w-full bg-neutral-800 text-white rounded px-2 py-1"
              value={edit.memo}
              rows={2}
              onChange={(e) =>
                setEdit((edit) => ({ ...edit, memo: e.target.value }))
              }
            />
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={() => removeRegion(activeRegionId)}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
            >
              삭제
            </button>
            <button
              onClick={() => {
                updateRegion(activeRegionId, (prev) => ({
                  ...prev,
                  label: edit.label,
                  memo: edit.memo,
                  color: edit.color,
                }));
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
            >
              저장
            </button>
          </div>
        </div>
      )}
      {/* 프로젝트 설명 */}
      <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-neutral-800 text-neutral-100 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-2">프로젝트 설명</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            ECG 신호를 시각화하고, 마우스 드래그로 관심 구간(영역)을
            생성/편집/삭제할 수 있습니다.
          </li>
          <li>
            각 영역은 별도의 라벨, 색상, 설명을 저장할 수 있으며, 실시간으로
            차트에 반영됩니다.
          </li>
          <li>
            영역 이동/리사이즈/hover/선택 강조 등 고급 인터랙션을 커스텀 SVG로
            직접 구현했습니다.
          </li>
          <li>
            React, Highcharts, Zustand(상태관리) 등 최신 기술 스택을
            활용했습니다.
          </li>
        </ul>
        <div className="mt-4 text-xs text-neutral-400">
          <b>주요 구현 포인트:</b> <br />
          - Highcharts selection 이벤트를 활용한 드래그 기반 영역 생성
          <br />
          - 커스텀 핸들러(SVG path/rect)로 영역 이동 및 리사이즈
          <br />
          - 영역별 hover/선택 상태를 독립적으로 관리하여 UX 개선
          <br />- 반응형 차트 및 패널 정렬, 어두운 테마 대응 등 시각적 완성도
          향상
        </div>
      </div>
    </div>
  );
}
