"use client";

import { useRef, useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "highcharts/highcharts-more";
import "highcharts/modules/xrange";
import "highcharts/modules/draggable-points";
import { v4 as uuidv4 } from "uuid";
import { useRegionStore } from "@/store/useRegionStore";

const MAJOR_TICK_COLOR = "#c7ced2";
const MINOR_TICK_COLOR = "#e6eaec";
const FONT_COLOR = "#8f979d";
const WIDTH = 900;
const HEIGHT = WIDTH * 0.12 + 15;
const LINE_WIDTH = 1;
const MIN_REGION_WIDTH = 50;

export default function EcgChart({ ecgData = [] }) {
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

  useEffect(() => {
    if (!chartRef.current?.chart) return;
    const chart = chartRef.current.chart;
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

      // 해당 영역의 hover 상태만 반영
      const isHovered = hoveredRegions[region.id] === true;

      // 왼쪽 끝 세로 라인 핸들 (리사이즈)
      const startHandle = renderer
        .path(["M", startX, top, "L", startX, bottom])
        .attr({
          stroke: isHovered ? "#1976d2" : "#666",
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
        .path(["M", endX, top, "L", endX, bottom])
        .attr({
          stroke: isHovered ? "#1976d2" : "#666",
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
      const rectX = Math.min(startX, endX) + 8;
      const rectW = Math.max(0, Math.abs(endX - startX) - 16);
      if (!isNaN(rectX) && !isNaN(rectW) && rectW > 0) {
        const bodyRect = renderer
          .rect(rectX, top, rectW, bottom - top, 0)
          .attr({
            fill: isHovered ? "rgba(25, 118, 210, 0.15)" : "rgba(0,0,0,0.001)",
            cursor: "move",
            zIndex: 15,
            // "stroke-width": isHovered ? 2 : 0,
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
        (chart.xAxis[0].max - chart.xAxis[0].min) / chart.xAxis[0].width;

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
            ])
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
          return this.value !== 2500 ? `${this.value / 250}s` : "";
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
          color:
            region.id === activeRegionId
              ? "rgba(128, 0, 255, 0.5)"
              : region.color,
          label: region.label,
        })),
        dataLabels: {
          enabled: true,
          formatter: function () {
            return this.point.label;
          },
          style: {
            color: "#000",
            textOutline: "none",
            fontWeight: "bold",
          },
          align: "left",
          verticalAlign: "top",
          padding: 3,
        },
        dragDrop: {
          draggableX: false,
          draggableX2: false,
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
    <div className="relative">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        ref={chartRef}
      />

      {activeRegionId && (
        <div className="absolute top-2 right-2 bg-white/90 p-2 rounded shadow-md">
          <div className="text-sm">
            {regions.find((r) => r.id === activeRegionId)?.label ||
              "선택된 영역"}
          </div>
          <div className="flex space-x-2 mt-1">
            <button
              onClick={() => {
                const region = regions.find((r) => r.id === activeRegionId);
                const newLabel = prompt("영역 이름 변경", region?.label || "");
                newLabel &&
                  updateRegion(region.id, (prev) => ({
                    ...prev,
                    label: newLabel,
                  }));
              }}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              이름 변경
            </button>
            <button
              onClick={() => removeRegion(activeRegionId)}
              className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
