import React, { useRef, useEffect, useState } from 'react';
import { RotateCw, Sparkles, Compass } from 'lucide-react';

export default function Hero3DObject({
  practical,
  onInteract,
  controlledStep = null,
  onStepChange = null,
  isPlaying = true,
  playbackSpeed = 1,
  activeNodeId = null,
  visitedNodeIds = [],
  hideOverlays = false,
}) {
  const canvasRef = useRef(null);
  const [isRotating, setIsRotating] = useState(isPlaying);
  const [activeStep, setActiveStep] = useState(0);

  const propsRef = useRef({
    isRotating,
    isPlaying,
    playbackSpeed,
    controlledStep,
    onStepChange,
    activeNodeId,
    visitedNodeIds,
  });

  useEffect(() => {
    propsRef.current = {
      isRotating,
      isPlaying,
      playbackSpeed,
      controlledStep,
      onStepChange,
      activeNodeId,
      visitedNodeIds,
    };
  });

  // Animation & 3D state refs to avoid re-renders during 60fps loop
  const stateRef = useRef({
    angleX: 0.25,
    angleY: 0.4,
    targetAngleX: 0.25,
    targetAngleY: 0.4,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    pulseProgress: 0,
    nodes: [],
    edges: [],
  });

  // Generate 3D nodes and edges dynamically based on practical title, category, and algorithm
  useEffect(() => {
    const title = (practical?.title || '').toLowerCase();
    const cat = (practical?.category || '').toLowerCase();
    const pracId = (practical?.id || '').toLowerCase();

    if (title.includes('dijkstra') || title.includes('shortest path') || pracId.includes('dijkstra')) {
      // 3D Graph Structure
      stateRef.current.nodes = [
        { id: 0, label: 'S (0)', x: -100, y: 0, z: 0, active: true },
        { id: 1, label: 'A (4)', x: -40, y: -70, z: -40 },
        { id: 2, label: 'B (2)', x: -30, y: 60, z: 50 },
        { id: 3, label: 'C (7)', x: 40, y: -50, z: 30 },
        { id: 4, label: 'D (5)', x: 50, y: 70, z: -30 },
        { id: 5, label: 'T (6)', x: 110, y: 10, z: 10 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1, weight: '4' },
        { from: 0, to: 2, weight: '2' },
        { from: 1, to: 2, weight: '1' },
        { from: 1, to: 3, weight: '5' },
        { from: 2, to: 4, weight: '8' },
        { from: 2, to: 3, weight: '8' },
        { from: 3, to: 5, weight: '2' },
        { from: 4, to: 5, weight: '3' },
      ];
    } else if (title.includes('avl') || title.includes('balanced tree') || pracId.includes('avl')) {
      // 3D AVL Balanced Tree
      stateRef.current.nodes = [
        { id: 0, label: '30 [0]', x: 0, y: -90, z: 0 },
        { id: 1, label: '20 [0]', x: -75, y: -20, z: -25 },
        { id: 2, label: '40 [0]', x: 75, y: -20, z: 25 },
        { id: 3, label: '10 [0]', x: -115, y: 55, z: -45 },
        { id: 4, label: '25 [0]', x: -35, y: 55, z: -5 },
        { id: 5, label: '35 [0]', x: 35, y: 55, z: 5 },
        { id: 6, label: '50 [0]', x: 115, y: 55, z: 45 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 1, to: 3 },
        { from: 1, to: 4 },
        { from: 2, to: 5 },
        { from: 2, to: 6 },
      ];
    } else if (title.includes('stack') || cat.includes('stack')) {
      // 3D Vertical Stack Tower (LIFO Ordering)
      stateRef.current.nodes = [
        { id: 0, label: '10 [Base]', x: 0, y: 70, z: 0, order: 0 },
        { id: 1, label: '20', x: 0, y: 35, z: 5, order: 1 },
        { id: 2, label: '30', x: 0, y: 0, z: 10, order: 2 },
        { id: 3, label: '40 [Top]', x: 0, y: -35, z: 15, order: 3 },
        { id: 4, label: '50 [Push]', x: 0, y: -75, z: 20, order: 4 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ];
    } else if (title.includes('queue') || cat.includes('queue') || pracId.includes('scheduling')) {
      // 3D Horizontal Queue Pipeline (FIFO Ordering)
      stateRef.current.nodes = [
        { id: 0, label: '10 [Front]', x: -100, y: 0, z: -20, order: 0 },
        { id: 1, label: '20', x: -50, y: 0, z: -10, order: 1 },
        { id: 2, label: '30', x: 0, y: 0, z: 0, order: 2 },
        { id: 3, label: '40', x: 50, y: 0, z: 10, order: 3 },
        { id: 4, label: '50 [Rear]', x: 100, y: 0, z: 20, order: 4 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ];
    } else if (title.includes('search')) {
      // 3D Linear & Binary Search Indexed Array
      stateRef.current.nodes = [
        { id: 0, label: '[0]: 10', x: -120, y: 0, z: -30, order: 0 },
        { id: 1, label: '[1]: 20', x: -60, y: 0, z: -15, order: 1 },
        { id: 2, label: '[2]: 30 (Mid)', x: 0, y: 0, z: 0, order: 2 },
        { id: 3, label: '[3]: 40 (Key)', x: 60, y: 0, z: 15, order: 3 },
        { id: 4, label: '[4]: 50', x: 120, y: 0, z: 30, order: 4 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ];
    } else if (title.includes('sort')) {
      // 3D Sorting Array with Comparative Pair Elements
      stateRef.current.nodes = [
        { id: 0, label: '64', x: -120, y: -25, z: -20, order: 0 },
        { id: 1, label: '25', x: -60, y: 15, z: -10, order: 1 },
        { id: 2, label: '12 [Min]', x: 0, y: 35, z: 0, order: 2 },
        { id: 3, label: '22', x: 60, y: 20, z: 10, order: 3 },
        { id: 4, label: '11', x: 120, y: 40, z: 20, order: 4 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ];
    } else if (title.includes('largest') || (title.includes('array') && !title.includes('tree'))) {
      // 3D Array Maximum Invariant Scan
      stateRef.current.nodes = [
        { id: 0, label: '[0]: 10', x: -100, y: 10, z: -20, order: 0 },
        { id: 1, label: '[1]: 20', x: -50, y: -10, z: -10, order: 1 },
        { id: 2, label: '[2]: 5', x: 0, y: 25, z: 0, order: 2 },
        { id: 3, label: '[3]: 15', x: 50, y: 5, z: 10, order: 3 },
        { id: 4, label: '[4]: 76 [Max]', x: 100, y: -45, z: 20, order: 4 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ];
    } else if (title.includes('python') || title.includes('recursion') || title.includes('function') || title.includes('operator')) {
      // 3D Execution Frame / Call Stack
      stateRef.current.nodes = [
        { id: 0, label: 'main()', x: 0, y: 70, z: 0, order: 0 },
        { id: 1, label: 'call(n)', x: 0, y: 35, z: 10, order: 1 },
        { id: 2, label: 'eval(cond)', x: 0, y: 0, z: 20, order: 2 },
        { id: 3, label: 'exec(op)', x: 0, y: -35, z: 30, order: 3 },
        { id: 4, label: 'return', x: 0, y: -70, z: 40, order: 4 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ];
    } else {
      // Default: 3D Binary Search Tree (Trees / Hierarchical Practicals)
      stateRef.current.nodes = [
        { id: 0, label: '50 (Root)', x: 0, y: -90, z: 0, order: 3 },
        { id: 1, label: '25', x: -80, y: -15, z: -30, order: 1 },
        { id: 2, label: '75', x: 80, y: -15, z: 30, order: 5 },
        { id: 3, label: '12', x: -125, y: 65, z: -50, order: 0 },
        { id: 4, label: '35', x: -35, y: 65, z: -10, order: 2 },
        { id: 5, label: '60', x: 35, y: 65, z: 10, order: 4 },
        { id: 6, label: '90', x: 125, y: 65, z: 50, order: 6 },
      ];
      stateRef.current.edges = [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 1, to: 3 },
        { from: 1, to: 4 },
        { from: 2, to: 5 },
        { from: 2, to: 6 },
      ];
    }
  }, [practical]);

  // Main 60fps Canvas 3D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 3D Math Helper: Rotate point in 3D around X and Y axes
    const rotate3D = (x, y, z, ax, ay) => {
      // Rotate around Y axis (Yaw)
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;

      // Rotate around X axis (Pitch)
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      return { x: x1, y: y2, z: z2 };
    };

    // Render loop
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const state = stateRef.current;
      const p = propsRef.current;

      // Inertia and auto-rotation
      if (p.isPlaying && p.isRotating && !state.isDragging) {
        state.targetAngleY += 0.005 * p.playbackSpeed;
      }
      state.angleX += (state.targetAngleX - state.angleX) * 0.1;
      state.angleY += (state.targetAngleY - state.angleY) * 0.1;

      // Pulse traversal animation
      let currentStep = activeStep;
      if (p.controlledStep !== null && p.controlledStep !== undefined) {
        currentStep = p.controlledStep;
        state.pulseProgress = currentStep / 7;
      } else if (p.isPlaying) {
        state.pulseProgress = (state.pulseProgress + 0.008 * p.playbackSpeed) % 1;
        currentStep = Math.floor(state.pulseProgress * 7);
        if (currentStep !== activeStep) {
          setActiveStep(currentStep);
          if (p.onStepChange) p.onStepChange(currentStep);
        }
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const focalLength = 320;

      // Transform all nodes
      const projectedNodes = state.nodes.map((node) => {
        const rotated = rotate3D(node.x, node.y, node.z, state.angleX, state.angleY);
        const scale = focalLength / (focalLength + rotated.z + 200);
        return {
          ...node,
          rx: rotated.x,
          ry: rotated.y,
          rz: rotated.z,
          screenX: centerX + rotated.x * scale,
          screenY: centerY + rotated.y * scale,
          scale: Math.max(0.4, scale),
        };
      });

      // Render subtle background grid plane
      ctx.strokeStyle = 'rgba(46, 46, 40, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gridSize = 160;
      const gridY = 110;
      for (let g = -gridSize; g <= gridSize; g += 40) {
        const p1 = rotate3D(g, gridY, -gridSize, state.angleX, state.angleY);
        const p2 = rotate3D(g, gridY, gridSize, state.angleX, state.angleY);
        const s1 = focalLength / (focalLength + p1.z + 200);
        const s2 = focalLength / (focalLength + p2.z + 200);
        ctx.moveTo(centerX + p1.x * s1, centerY + p1.y * s1);
        ctx.lineTo(centerX + p2.x * s2, centerY + p2.y * s2);

        const p3 = rotate3D(-gridSize, gridY, g, state.angleX, state.angleY);
        const p4 = rotate3D(gridSize, gridY, g, state.angleX, state.angleY);
        const s3 = focalLength / (focalLength + p3.z + 200);
        const s4 = focalLength / (focalLength + p4.z + 200);
        ctx.moveTo(centerX + p3.x * s3, centerY + p3.y * s3);
        ctx.lineTo(centerX + p4.x * s4, centerY + p4.y * s4);
      }
      ctx.stroke();

      // Render Edges
      state.edges.forEach((edge) => {
        const fromNode = projectedNodes.find((n) => n.id === edge.from);
        const toNode = projectedNodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return;

        // Subtle gradient line
        const avgZ = (fromNode.rz + toNode.rz) / 2;
        const alpha = Math.max(0.2, Math.min(0.7, 0.45 - avgZ / 350));

        ctx.strokeStyle = `rgba(116, 128, 90, ${alpha})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(fromNode.screenX, fromNode.screenY);
        ctx.lineTo(toNode.screenX, toNode.screenY);
        ctx.stroke();

        // Traversal Pulse Particle along the branch
        const t = (state.pulseProgress * 3 + edge.from * 0.2) % 1;
        const pulseX = fromNode.screenX + (toNode.screenX - fromNode.screenX) * t;
        const pulseY = fromNode.screenY + (toNode.screenY - fromNode.screenY) * t;

        // Olive particle
        const pulseGrad = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 6);
        pulseGrad.addColorStop(0, 'rgba(116, 128, 90, 0.9)');
        pulseGrad.addColorStop(1, 'rgba(116, 128, 90, 0)');
        ctx.fillStyle = pulseGrad;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Depth sort nodes so front nodes occlude back ones
      const sortedNodes = [...projectedNodes].sort((a, b) => b.rz - a.rz);

      // Render Nodes
      sortedNodes.forEach((node) => {
        const radius = 18 * node.scale;

        // Node Glow Halo
        const glowGrad = ctx.createRadialGradient(
          node.screenX,
          node.screenY,
          radius * 0.4,
          node.screenX,
          node.screenY,
          radius * 2.2
        );
        glowGrad.addColorStop(0, 'rgba(116, 128, 90, 0.12)');
        glowGrad.addColorStop(1, 'rgba(250, 250, 247, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        const isActive = p.activeNodeId !== null && p.activeNodeId !== undefined
          ? node.id === p.activeNodeId
          : (node.order !== undefined ? node.order === currentStep : node.id === currentStep);
        const isVisited = Array.isArray(p.visitedNodeIds) && p.visitedNodeIds.includes(node.id);

        // Node Core Body (Paper white surface)
        ctx.fillStyle = isActive ? '#EFF6FF' : isVisited ? '#F0FDF4' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        const isRoot = node.id === 0;
        if (isActive) {
          ctx.strokeStyle = '#1D4ED8';
          ctx.lineWidth = 2.8;
        } else if (isVisited) {
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2.0;
        } else {
          ctx.strokeStyle = isRoot ? '#1D4ED8' : 'rgba(116, 128, 90, 0.45)';
          ctx.lineWidth = isRoot ? 2.2 : 1.2;
        }
        ctx.stroke();

        // Top subtle highlight inside node
        ctx.strokeStyle = 'rgba(46, 46, 40, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY - radius * 0.2, radius * 0.7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

        // Text label (warm charcoal)
        ctx.fillStyle = '#2E2E28';
        ctx.font = `600 ${Math.max(9, Math.round(11 * node.scale))}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label.split(' ')[0], node.screenX, node.screenY);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse / Touch Drag Handlers for 3D Perspective Rotation
  const handleMouseDown = (e) => {
    stateRef.current.isDragging = true;
    stateRef.current.lastMouseX = e.clientX;
    stateRef.current.lastMouseY = e.clientY;
    if (onInteract) onInteract();
  };

  const handleMouseMove = (e) => {
    if (!stateRef.current.isDragging) return;
    const deltaX = e.clientX - stateRef.current.lastMouseX;
    const deltaY = e.clientY - stateRef.current.lastMouseY;
    stateRef.current.targetAngleY += deltaX * 0.008;
    stateRef.current.targetAngleX -= deltaY * 0.008;
    // Clamp pitch angle so structure doesn't flip upside down
    stateRef.current.targetAngleX = Math.max(-0.6, Math.min(0.8, stateRef.current.targetAngleX));
    stateRef.current.lastMouseX = e.clientX;
    stateRef.current.lastMouseY = e.clientY;
  };

  const handleMouseUp = () => {
    stateRef.current.isDragging = false;
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      stateRef.current.isDragging = true;
      stateRef.current.lastMouseX = e.touches[0].clientX;
      stateRef.current.lastMouseY = e.touches[0].clientY;
      if (onInteract) onInteract();
    }
  };

  const handleTouchMove = (e) => {
    if (!stateRef.current.isDragging || !e.touches || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - stateRef.current.lastMouseX;
    const deltaY = e.touches[0].clientY - stateRef.current.lastMouseY;
    stateRef.current.targetAngleY += deltaX * 0.008;
    stateRef.current.targetAngleX -= deltaY * 0.008;
    stateRef.current.targetAngleX = Math.max(-0.6, Math.min(0.8, stateRef.current.targetAngleX));
    stateRef.current.lastMouseX = e.touches[0].clientX;
    stateRef.current.lastMouseY = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    stateRef.current.isDragging = false;
  };

  const resetPerspective = (e) => {
    e.stopPropagation();
    stateRef.current.targetAngleX = 0.25;
    stateRef.current.targetAngleY = 0.4;
  };

  const toggleRotation = (e) => {
    e.stopPropagation();
    setIsRotating(!isRotating);
  };

  return (
    <div
      className="hero-3d-wrapper"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
      title="Interactive 3D Data Structure · Touch or Drag to Orbit"
    >
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="hero-3d-canvas" />

      {/* Optional Overlays when not embedded in comprehensive controller */}
      {!hideOverlays && (
        <>
          <div className="hero-3d-tag">
            <Sparkles size={12} color="var(--accent-text)" />
            <span>3D {practical?.category || 'Algorithm Projection'}</span>
          </div>

          <div className="hero-3d-traversal-step">
            <span className="step-label">Live Traversal:</span>
            <span className="step-val">Step {activeStep + 1} of {stateRef.current?.nodes?.length || 5}</span>
          </div>

          <div className="hero-3d-controls">
            <button
              type="button"
              className={`hero-3d-btn ${isRotating ? 'active' : ''}`}
              onClick={toggleRotation}
              title={isRotating ? 'Pause Orbit' : 'Resume Orbit'}
            >
              <RotateCw size={12} />
              <span>{isRotating ? 'Orbit' : 'Paused'}</span>
            </button>

            <button
              type="button"
              className="hero-3d-btn"
              onClick={resetPerspective}
              title="Reset Camera View"
            >
              <Compass size={12} />
              <span>Reset</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
