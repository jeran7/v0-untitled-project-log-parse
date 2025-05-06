"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>
  className?: string
}

export default function PieChart({ data, className = "" }: PieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()

    // Set up dimensions
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const radius = Math.min(width, height) / 2 - 40

    // Create SVG group
    const svg = d3
      .select(svgRef.current)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`)

    // Create pie generator
    const pie = d3
      .pie<any>()
      .value((d) => d.value)
      .sort(null)

    // Create arc generator
    const arc = d3.arc().innerRadius(0).outerRadius(radius)

    // Create arc for labels
    const labelArc = d3
      .arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6)

    // Create pie chart
    const arcs = svg.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc")

    // Add slices
    arcs
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d, i) => data[i].color || d3.schemeCategory10[i % 10])
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0.8)

    // Add labels
    arcs
      .append("text")
      .attr("transform", (d) => `translate(${labelArc.centroid(d as any)})`)
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "white")
      .text((d, i) => (d.data.value > 0 ? data[i].name : ""))

    // Add percentage labels
    arcs
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d as any)})`)
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "white")
      .text((d) => {
        const percentage = ((d.data.value / d3.sum(data, (d) => d.value)) * 100).toFixed(0)
        return d.data.value > 0 ? `${percentage}%` : ""
      })

    // Add legend
    const legend = d3
      .select(svgRef.current)
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 100}, 20)`)

    data.forEach((d, i) => {
      const legendItem = legend.append("g").attr("transform", `translate(0, ${i * 20})`)

      legendItem
        .append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d.color || d3.schemeCategory10[i % 10])

      legendItem.append("text").attr("x", 15).attr("y", 10).text(`${d.name} (${d.value})`).style("font-size", "10px")
    })
  }, [data])

  return <svg ref={svgRef} width="100%" height="100%" className={className}></svg>
}
