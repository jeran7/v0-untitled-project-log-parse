"use client"

import { useRef, useEffect } from "react"
import * as d3 from "d3"

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>
}

export default function PieChart({ data }: PieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()

    // Set up dimensions
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const radius = Math.min(width, height) / 2 - 40

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`)

    // Create color scale
    const defaultColors = d3.schemeCategory10
    const color = (d: any, i: number) => d.color || defaultColors[i % defaultColors.length]

    // Create pie generator
    const pie = d3
      .pie<any>()
      .value((d) => d.value)
      .sort(null)

    // Create arc generator
    const arc = d3.arc().innerRadius(0).outerRadius(radius)
    const arcHover = d3
      .arc()
      .innerRadius(0)
      .outerRadius(radius + 10)

    // Create tooltip
    const tooltip = tooltipRef.current
      ? d3.select(tooltipRef.current)
      : d3
          .select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("visibility", "hidden")
          .style("background", "white")
          .style("border", "1px solid #ddd")
          .style("border-radius", "4px")
          .style("padding", "8px")
          .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
          .style("pointer-events", "none")
          .style("z-index", "10")

    // Create pie slices
    const slices = svg.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc")

    slices
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d, i) => color(d.data, i))
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("d", arcHover as any)

        const percent = ((d.data.value / d3.sum(data, (d) => d.value)) * 100).toFixed(1)

        tooltip
          .html(
            `<div>
              <strong>${d.data.name}</strong>
              <div>${d.data.value} (${percent}%)</div>
            </div>`,
          )
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
      })
      .on("mousemove", (event) => {
        tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 10}px`)
      })
      .on("mouseout", function () {
        d3.select(this).attr("d", arc as any)
        tooltip.style("visibility", "hidden")
      })

    // Add legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${radius + 20}, ${-radius})`)

    data.forEach((d, i) => {
      const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`)

      legendRow.append("rect").attr("width", 10).attr("height", 10).attr("fill", color(d, i))

      legendRow.append("text").attr("x", 15).attr("y", 10).text(`${d.name} (${d.value})`).style("font-size", "12px")
    })
  }, [data])

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full">No data available</div>
  }

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} width="100%" height="100%" />
      <div ref={tooltipRef} className="tooltip" />
    </div>
  )
}
