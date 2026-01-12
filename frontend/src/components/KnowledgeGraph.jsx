import React, { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";

const KnowledgeGraph = ({ data }) => {
  const containerRef = useRef(null);
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge").strength(-500);
      fgRef.current.d3Force("link").distance(120);
    }
  }, [data]);

  const handleNodeHover = (node) => {
    setHoverNode(node || null);
    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    if (node) {
      newHighlightNodes.add(node);
      data.links.forEach((link) => {
        if (link.source.id === node.id || link.target.id === node.id) {
          newHighlightLinks.add(link);
          newHighlightNodes.add(link.source);
          newHighlightNodes.add(link.target);
        }
      });
    }
    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  };

  const handleNodeClick = (node) => {
    if (node.id.startsWith("http")) {
      window.open(node.id, "_blank");
    }
  };

  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      const isHover = highlightNodes.has(node) || node === hoverNode;
      const isDimmed = hoverNode && !isHover;

      const size = node.val ? node.val / 1.5 : 8;

      if (node.group === 1 && node.img) {
        const img = new Image();
        img.src = node.img;

        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = isDimmed ? "#e2e8f0" : "#fff";
        ctx.fill();
        ctx.clip();

        try {
          ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
        } catch (e) {
          ctx.fillStyle = "#3b82f6";
          ctx.fill();
        }
        ctx.restore();

        // Border
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.lineWidth = isHover ? 3 : 1.5; // Thicker border
        ctx.strokeStyle = isHover ? "#2563eb" : "#fff";
        ctx.stroke();
      } else {
        // Draw Standard Nodes
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = isDimmed
          ? "#f1f5f9"
          : node.color || (node.group === 2 ? "#10b981" : "#64748b");
        ctx.fill();

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (isHover || node.group === 1) {
        const labelText = node.label || node.id.split(/[\/#]/).pop().replace(/_/g, " ");
        const fontSize = 14 / globalScale; // Slightly larger font

        ctx.font = `${node.group === 1 ? "bold" : ""} ${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textWidth = ctx.measureText(labelText).width;
        const bckgDimensions = [textWidth, fontSize].map(
          (n) => n + fontSize * 0.2
        );

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(
          node.x - bckgDimensions[0] / 2,
          node.y + size + 2,
          bckgDimensions[0],
          bckgDimensions[1]
        );

        ctx.fillStyle = isDimmed ? "#cbd5e1" : "#1e293b";
        ctx.fillText(labelText, node.x, node.y + size + fontSize / 2 + 2);
      }
    },
    [highlightNodes, hoverNode]
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        cursor: hoverNode ? "pointer" : "default",
      }}
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node, color, ctx) => {
          const size = node.val ? node.val / 1.5 : 8;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        linkColor={(link) => (highlightLinks.has(link) ? "#2563eb" : "#e2e8f0")}
        linkWidth={(link) => (highlightLinks.has(link) ? 2.5 : 1)}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
      />
    </div>
  );
};

export default KnowledgeGraph;
