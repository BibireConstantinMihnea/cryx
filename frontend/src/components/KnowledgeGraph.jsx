import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const KnowledgeGraph = ({ data }) => {
  const containerRef = useRef(null);
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-400);
      
      fgRef.current.d3Force('link').distance(120);

      fgRef.current.d3Force('center').strength(0.05);
    }
  }, [data]);
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        
        nodeLabel="id"
        nodeAutoColorBy="group"
        nodeRelSize={8}
        
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkWidth={1.5}
        linkColor={() => '#94a3b8'}

        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(link, ctx) => {
          const label = link.label;
          if (!label) return;

          const start = link.source;
          const end = link.target;

          if (typeof start !== 'object' || typeof end !== 'object') return;

          const textPos = {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2,
          };

          const relLink = { x: end.x - start.x, y: end.y - start.y };
          let textAngle = Math.atan2(relLink.y, relLink.x);

          if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
          if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

          const fontSize = 3.5;
          ctx.font = `bold ${fontSize}px Sans-Serif`;
          
          ctx.save();
          ctx.translate(textPos.x, textPos.y);
          ctx.rotate(textAngle);
          
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(-textWidth / 2 - 1, -fontSize / 2 - 1, textWidth + 2, fontSize + 2);
          
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#475569';
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }}
        
        cooldownTicks={100}
        onEngineStop={() => fgRef.current.zoomToFit(400)}
      />
    </div>
  );
};

export default KnowledgeGraph;