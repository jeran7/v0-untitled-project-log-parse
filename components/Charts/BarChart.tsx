"use client"

import type React from "react"

import { useRef, useEffect } from "react"
import * as d3 from "d3"
import ReactDOM from "react-dom/client"

interface BarChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>
  color?: string
  tooltipFormatter?: (item: any) => React.ReactNode
}

export default function BarChart({ data, color = "#3b82f6", tooltipFormatter }: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()

    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = svgRef.current.clientHeight - margin.top - margin.bottom

    // Create SVG
    const svg = d3.select(svgRef.current).append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Create scales
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, width])
      .padding(0.3)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
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

    // Create bars
    svg
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name) || 0)
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => height - y(d.value))
      .attr("fill", color)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", d3.color(color)?.brighter(0.5) || color)

        if (tooltipFormatter) {
          tooltip.html(() => {
            const div = document.createElement("div")
            const reactRoot = document.createDocumentFragment()
            const reactElement = tooltipFormatter(d)
            // @ts-ignore - React 18 API
            ReactDOM.createRoot(div).render(reactElement)
            return div.innerHTML
          })
        } else {
          tooltip.html(`<div><strong>${d.name}</strong>: ${d.value}</div>`)
        }

        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
      })
      .on("mousemove", (event) => {
        tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 10}px`)
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", color)
        tooltip.style("visibility", "hidden")
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
  }, [data, color, tooltipFormatter])

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
