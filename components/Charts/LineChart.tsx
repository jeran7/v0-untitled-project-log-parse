"use client"

import { useRef, useEffect } from "react"
import * as d3 from "d3"

interface LineChartProps {
  data: Array<{ name: string; [key: string]: any }>
  lines: Array<{ key: string; color: string; name?: string }>
}

export default function LineChart({ data, lines }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || data.length === 0 || lines.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()

    // Set up dimensions
    const margin = { top: 20, right: 80, bottom: 50, left: 60 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = svgRef.current.clientHeight - margin.top - margin.bottom

    // Create SVG
    const svg = d3.select(svgRef.current).append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Create scales
    const x = d3
      .scalePoint()
      .domain(data.map((d) => d.name))
      .range([0, width])
      .padding(0.5)

    // Find max value across all lines
    const maxValue = d3.max(data.flatMap((d) => lines.map((line) => d[line.key] || 0))) || 0

    const y = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .nice()
      .range([height, 0])

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

    // Create axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "12px")

    svg.append("g").call(d3.axisLeft(y).ticks(5))

    // Create line generator
    const line = d3
      .line<any>()
      .x((d) => x(d.name) || 0)
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    // Create lines
    lines.forEach((lineConfig) => {
      const lineData = data.map((d) => ({
        name: d.name,
        value: d[lineConfig.key] || 0,
      }))

      // Add line
      svg
        .append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", lineConfig.color)
        .attr("stroke-width", 2)
        .attr("d", line)

      // Add dots
      const dots = svg
        .selectAll(`.dot-${lineConfig.key}`)
        .data(lineData)
        .enter()
        .append("circle")
        .attr("class", `dot-${lineConfig.key}`)
        .attr("cx", (d) => x(d.name) || 0)
        .attr("cy", (d) => y(d.value))
        .attr("r", 4)
        .attr("fill", lineConfig.color)
        .style("opacity", 0.7)

      // Add interactivity
      dots
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 6).style("opacity", 1)

          tooltip
            .html(
              `<div>
                <strong>${lineConfig.name || lineConfig.key}</strong>
                <div>${d.name}: ${d.value}</div>
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
          d3.select(this).attr("r", 4).style("opacity", 0.7)
          tooltip.style("visibility", "hidden")
        })
    })

    // Add legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width + 10}, 0)`)

    lines.forEach((lineConfig, i) => {
      const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`)

      legendRow.append("rect").attr("width", 10).attr("height", 10).attr("fill", lineConfig.color)

      legendRow
        .append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text(lineConfig.name || lineConfig.key)
        .style("font-size", "12px")
    })

    // Add labels
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Count")
  }, [data, lines])

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
