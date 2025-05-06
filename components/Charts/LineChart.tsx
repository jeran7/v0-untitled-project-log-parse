"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"

interface LineChartProps {
  data: Array<{ name: string; [key: string]: any }>
  lines: Array<{ key: string; color: string }>
  className?: string
}

export default function LineChart({ data, lines, className = "" }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()

    // Set up dimensions
    const margin = { top: 20, right: 50, bottom: 40, left: 40 }
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Create scales
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, innerWidth])
      .padding(0.1)

    // Find the maximum value across all lines
    const maxValue = d3.max(data.flatMap((d) => lines.map((line) => d[line.key] || 0))) || 0

    const y = d3.scaleLinear().domain([0, maxValue]).nice().range([innerHeight, 0])

    // Create SVG group
    const svg = d3.select(svgRef.current).append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Add x-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .style("font-size", "10px")

    // Add y-axis
    svg.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size", "10px")

    // Create line generator
    const line = d3
      .line<any>()
      .x((d) => (x(d.name) || 0) + x.bandwidth() / 2)
      .y((d, i, data) => y(d[lines[0].key] || 0))
      .curve(d3.curveMonotoneX)

    // Add lines
    lines.forEach((lineConfig) => {
      const lineGenerator = d3
        .line<any>()
        .x((d) => (x(d.name) || 0) + x.bandwidth() / 2)
        .y((d) => y(d[lineConfig.key] || 0))
        .curve(d3.curveMonotoneX)

      svg
        .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", lineConfig.color)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator)

      // Add dots
      svg
        .selectAll(`.dot-${lineConfig.key}`)
        .data(data)
        .enter()
        .append("circle")
        .attr("class", `dot-${lineConfig.key}`)
        .attr("cx", (d) => (x(d.name) || 0) + x.bandwidth() / 2)
        .attr("cy", (d) => y(d[lineConfig.key] || 0))
        .attr("r", 3)
        .attr("fill", lineConfig.color)
    })

    // Add legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth - 100}, 0)`)

    lines.forEach((lineConfig, i) => {
      const legendItem = legend.append("g").attr("transform", `translate(0, ${i * 20})`)

      legendItem.append("rect").attr("width", 10).attr("height", 10).attr("fill", lineConfig.color)

      legendItem.append("text").attr("x", 15).attr("y", 10).text(lineConfig.key).style("font-size", "10px")
    })
  }, [data, lines])

  return <svg ref={svgRef} width="100%" height="100%" className={className}></svg>
}
