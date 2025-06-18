<script>
  import { onMount } from 'svelte';

  let canvas;
  let tooltip;
  let width, height;
  let nodes = [];
  let edges = [];
  let camera = { x: 0, y: 0, zoom: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let isAnimating = true;
  let showClusters = true;
  let focusedCluster = -1;
  let mousePos = { x: 0, y: 0 };
  let hoveredNode = null;
  let frameCount = 0;
  let lastTime = performance.now();

  // Cluster data
  const clusters = [
    {
      name: 'Equations & Laws',
      color: '#00bcd4',
      bgColor: 'rgba(0, 188, 212, 0.15)',
      center: { x: -300, y: -150 },
      nodes: [
        'Pythagorean Theorem', 'Triangle Area Formula', 'Quadratic Formula', 'Distance Formula',
        'Circle Area', 'Circle Circumference', 'Sphere Volume', 'Cylinder Volume',
        "Newton's 2nd Law", 'Kinetic Energy', 'Potential Energy', 'Conservation of Energy',
        "Ohm's Law", 'Power Formula', "Coulomb's Law", "Faraday's Law",
        'Ideal Gas Law', "Boyle's Law", "Charles's Law", '1st Law Thermodynamics',
        'Wave Equation', 'Frequency Formula', 'Doppler Effect', "Snell's Law",
        'Derivative Definition', 'Chain Rule', 'Product Rule', 'Fundamental Theorem',
        'Law of Cosines', 'Law of Sines', "Heron's Formula", "Euler's Formula",
        'Binomial Theorem', 'Taylor Series', "L'Hôpital's Rule", "Green's Theorem",
        "Divergence Theorem", "Stokes' Theorem", "Maxwell's Equations", "Schrödinger Equation",
        'Einstein Field Equations', 'Lorentz Transformation'
      ]
    },
    {
      name: 'Variables & Units',
      color: '#ff9800',
      bgColor: 'rgba(255, 152, 0, 0.15)',
      center: { x: 300, y: -150 },
      nodes: [
        'Temperature (T)', 'Pressure (P)', 'Volume (V)', 'Density (ρ)',
        'Mass (m)', 'Weight (W)', 'Force (F)', 'Acceleration (a)',
        'Velocity (v)', 'Displacement (s)', 'Time (t)', 'Frequency (f)',
        'Wavelength (λ)', 'Amplitude (A)', 'Period (T)', 'Phase (φ)',
        'Current (I)', 'Voltage (V)', 'Resistance (R)', 'Capacitance (C)',
        'Inductance (L)', 'Charge (Q)', 'Electric Field (E)', 'Magnetic Field (B)',
        'Height (h)', 'Width (w)', 'Length (l)', 'Area (A)',
        'Radius (r)', 'Diameter (d)', 'Circumference (C)', 'Perimeter (P)',
        'Angle (θ)', 'Angular Velocity (ω)', 'Coefficient (k)', 'Constant (c)',
        'Variable (x)', 'Parameter (α)', 'Index (i)', 'Ratio (r)'
      ]
    },
    {
      name: 'Concepts & Entities',
      color: '#e91e63',
      bgColor: 'rgba(233, 30, 99, 0.15)',
      center: { x: 0, y: 200 },
      nodes: [
        'Triangle', 'Square', 'Rectangle', 'Circle', 'Ellipse',
        'Pentagon', 'Hexagon', 'Polygon', 'Parallelogram', 'Rhombus',
        'Right Triangle', 'Isosceles Triangle', 'Equilateral Triangle', 'Scalene Triangle',
        'Thermodynamic System', 'Heat Engine', 'Carnot Cycle', 'Entropy',
        'Phase Transition', 'Critical Point', 'Equilibrium', 'Reversible Process',
        'Particle', 'Wave', 'Photon', 'Electron', 'Proton', 'Neutron',
        'Atom', 'Molecule', 'Ion', 'Compound', 'Element', 'Isotope',
        'Function', 'Domain', 'Range', 'Limit', 'Continuity', 'Derivative',
        'Integral', 'Matrix', 'Vector', 'Scalar', 'Tensor', 'Complex Number',
        'Prime Number', 'Fibonacci Sequence', 'Golden Ratio'
      ]
    }
  ];

  // Checks if an edge already exists between two nodes (by their IDs), in either direction.
  function edgeExists(fromId, toId) {
    return edges.some(e =>
      (e.from === fromId && e.to === toId) ||
      (e.from === toId && e.to === fromId)
    );
  }

  // Sets the canvas size to match the window's width and height.
  function initCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  // Generates the nodes for the graph based on the cluster data, assigning positions, colors, and properties.
  function createNodes() {
    nodes = [];
    let nodeId = 0;
    clusters.forEach((cluster, clusterIndex) => {
      cluster.nodes.forEach((name, nodeIndex) => {
        const angle = (nodeIndex / cluster.nodes.length) * Math.PI * 2;
        const radius = 80 + Math.random() * 100; // random radius from cluster center
        const jitter = 30;
        nodes.push({
          id: nodeId++,
          x: cluster.center.x + Math.cos(angle) * radius + (Math.random() - 0.5) * jitter,
          y: cluster.center.y + Math.sin(angle) * radius + (Math.random() - 0.5) * jitter,
          vx: 0,
          vy: 0,
          fx: 0,
          fy: 0,
          cluster: clusterIndex,
          name: name,
          color: cluster.color,
          radius: 5 + Math.random() * 4,
          connections: 0,
          importance: Math.random()
        });
      });
    });
  }

  // Creates edges between nodes, both within clusters (intra-cluster) and between clusters (inter-cluster),
  // ensuring no duplicate edges and updating node connection counts.
  function createEdges() {
    edges = [];
    const targetEdges = 180;
    let edgeCount = 0;
    // Intra-cluster
    clusters.forEach((cluster, clusterIndex) => {
      const clusterNodes = nodes.filter(n => n.cluster === clusterIndex);
      const intraConnections = Math.floor(clusterNodes.length * 1.2);
      for (let i = 0; i < intraConnections && edgeCount < targetEdges * 0.75; i++) {
        const from = clusterNodes[Math.floor(Math.random() * clusterNodes.length)];
        const to = clusterNodes[Math.floor(Math.random() * clusterNodes.length)];
        if (from.id !== to.id && !edgeExists(from.id, to.id)) {
          edges.push({
            from: from.id,
            to: to.id,
            strength: 0.6 + Math.random() * 0.4,
            type: 'intra',
            cluster: clusterIndex
          });
          from.connections++;
          to.connections++;
          edgeCount++;
        }
      }
    });
    // Inter-cluster
    const interConnections = targetEdges - edgeCount;
    for (let i = 0; i < interConnections; i++) {
      const from = nodes[Math.floor(Math.random() * nodes.length)];
      const to = nodes[Math.floor(Math.random() * nodes.length)];
      if (from.cluster !== to.cluster && !edgeExists(from.id, to.id)) {
        edges.push({
          from: from.id,
          to: to.id,
          strength: 0.2 + Math.random() * 0.3,
          type: 'inter',
          cluster: -1
        });
        from.connections++;
        to.connections++;
      }
    }
  }

  // Applies force-directed layout physics to nodes, including repulsion, attraction, and cluster centering.
  function applyForces() {
    if (!isAnimating) return;
    const damping = 0.92;
    const repulsion = 1200;
    const attraction = 0.08;
    const clusterAttraction = 0.05;
    nodes.forEach(node => {
      node.fx = 0;
      node.fy = 0;
    });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        if (distance < 120) {
          const force = repulsion / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          nodes[i].fx += fx;
          nodes[i].fy += fy;
          nodes[j].fx -= fx;
          nodes[j].fy -= fy;
        }
      }
    }
    edges.forEach(edge => {
      const from = nodes[edge.from];
      const to = nodes[edge.to];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDistance = edge.type === 'intra' ? 60 : 100;
      const force = attraction * edge.strength * (distance - idealDistance);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      from.fx += fx;
      from.fy += fy;
      to.fx -= fx;
      to.fy -= fy;
    });
    nodes.forEach(node => {
      const cluster = clusters[node.cluster];
      const dx = cluster.center.x - node.x;
      const dy = cluster.center.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance > 200) {
        const force = clusterAttraction * (distance - 200);
        node.fx += (dx / distance) * force;
        node.fy += (dy / distance) * force;
      }
    });
    nodes.forEach(node => {
      node.vx = (node.vx + node.fx * 0.008) * damping;
      node.vy = (node.vy + node.fy * 0.008) * damping;
      node.x += node.vx;
      node.y += node.vy;
    });
  }

  // Draws the background ellipses for each cluster, including cluster labels.
  function drawClusterBackgrounds(ctx) {
    if (!showClusters) return;
    clusters.forEach((cluster, clusterIndex) => {
      if (focusedCluster !== -1 && focusedCluster !== clusterIndex) return;
      const clusterNodes = nodes.filter(n => n.cluster === clusterIndex);
      if (clusterNodes.length === 0) return;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      clusterNodes.forEach(node => {
        const screenX = (node.x - camera.x) * camera.zoom + width / 2;
        const screenY = (node.y - camera.y) * camera.zoom + height / 2;
        minX = Math.min(minX, screenX);
        maxX = Math.max(maxX, screenX);
        minY = Math.min(minY, screenY);
        maxY = Math.max(maxY, screenY);
      });
      const padding = 60;
      minX -= padding;
      maxX += padding;
      minY -= padding;
      maxY += padding;
      ctx.fillStyle = cluster.bgColor;
      ctx.strokeStyle = cluster.color + '80';
      ctx.lineWidth = 2;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const radiusX = (maxX - minX) / 2;
      const radiusY = (maxY - minY) / 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = cluster.color;
      ctx.font = 'bold 16px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(cluster.name.toUpperCase(), centerX, minY + 20);
    });
  }

  // Draws all edges between nodes, with different styles for intra- and inter-cluster edges.
  function drawEdges(ctx) {
    edges.forEach(edge => {
      const from = nodes[edge.from];
      const to = nodes[edge.to];
      if (focusedCluster !== -1 &&
        from.cluster !== focusedCluster &&
        to.cluster !== focusedCluster) {
        return;
      }
      const fromX = (from.x - camera.x) * camera.zoom + width / 2;
      const fromY = (from.y - camera.y) * camera.zoom + height / 2;
      const toX = (to.x - camera.x) * camera.zoom + width / 2;
      const toY = (to.y - camera.y) * camera.zoom + height / 2;
      if ((fromX < -50 && toX < -50) || (fromX > width + 50 && toX > width + 50) ||
        (fromY < -50 && toY < -50) || (fromY > height + 50 && toY > height + 50)) {
        return;
      }
      const alpha = edge.type === 'inter' ? 0.3 : 0.6;
      const color = edge.type === 'inter' ? '#000000' : clusters[from.cluster].color;
      ctx.strokeStyle = color + Math.floor(alpha * edge.strength * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = edge.strength * 2 * camera.zoom;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    });
  }

  // Draws all nodes, including glow effects, connection counts, and hover detection.
  function drawNodes(ctx) {
    hoveredNode = null;
    let visibleCount = 0;
    nodes.forEach(node => {
      if (focusedCluster !== -1 && node.cluster !== focusedCluster) return;
      const screenX = (node.x - camera.x) * camera.zoom + width / 2;
      const screenY = (node.y - camera.y) * camera.zoom + height / 2;
      if (screenX < -30 || screenX > width + 30 || screenY < -30 || screenY > height + 30) {
        return;
      }
      visibleCount++;
      const radius = node.radius * camera.zoom;
      const dx = mousePos.x - screenX;
      const dy = mousePos.y - screenY;
      if (Math.sqrt(dx * dx + dy * dy) < radius + 8) {
        hoveredNode = node;
      }
      const isHovered = hoveredNode === node;
      const glowIntensity = isHovered ? 0.8 : node.importance * 0.4;
      if (glowIntensity > 0.2) {
        const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 2);
        gradient.addColorStop(0, node.color + Math.floor(glowIntensity * 100).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, node.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = node.color;
      ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = isHovered ? 3 : 1;
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (camera.zoom > 2) {
        ctx.fillStyle = '#595959';
        ctx.font = Math.floor(10 * camera.zoom) + 'px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, screenX, screenY - radius - 5);
      }
      else if (node.importance > 0.5 && camera.zoom > 0.6) {
        ctx.fillStyle = '#595959';
        ctx.font = Math.floor(10 * camera.zoom) + 'px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, screenX, screenY - radius + 3);
      }
    });
    visibleNodes = visibleCount;
  }

  let visibleNodes = 0;
  let edgeCount = 0;
  let fps = 60;
  let zoomLevel = 1.0;

  // Updates and displays the tooltip for the currently hovered node, if any.
  function updateTooltip() {
    if (hoveredNode && tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.left = Math.min(mousePos.x + 15, width - 260) + 'px';
      tooltip.style.top = Math.max(mousePos.y - 50, 10) + 'px';
      const clusterName = clusters[hoveredNode.cluster].name;
      tooltip.innerHTML = `
        <div style="color: ${hoveredNode.color}; font-weight: bold; margin-bottom: 8px;">
          ${hoveredNode.name}
        </div>
        <div style="font-size: 12px; opacity: 0.8;">
          Cluster: ${clusterName}<br>
          Connections: ${hoveredNode.connections}<br>
          Importance: ${(hoveredNode.importance * 100).toFixed(0)}%
        </div>
      `;
    } else if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  // Renders the entire graph: backgrounds, edges, nodes, and tooltip, and updates stats.
  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    drawClusterBackgrounds(ctx);
    drawEdges(ctx);
    drawNodes(ctx);
    updateTooltip();
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = currentTime;
    }
    zoomLevel = camera.zoom;
    edgeCount = edges.length;
  }

  // Animation loop: applies forces and renders the graph on each animation frame.
  function animate() {
    applyForces();
    render();
    requestAnimationFrame(animate);
  }

  // Toggles the animation (pause/resume force layout and rendering).
  function toggleAnimation() {
    isAnimating = !isAnimating;
  }

  // Resets the camera view to the default position and zoom.
  function resetView() {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;
  }

  // Toggles the visibility of cluster backgrounds.
  function toggleClusters() {
    showClusters = !showClusters;
  }

  // Focuses the view on a specific cluster, or shows all clusters if index is -1.
  function focusCluster(index) {
    focusedCluster = index;
  }

  onMount(() => {
    initCanvas();
    createNodes();
    createEdges();
    focusCluster(-1);
    animate();

    window.addEventListener('resize', initCanvas);

    // Mouse events
    let dragOrigin = { x: 0, y: 0 };
    let mouseStart = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = canvas.getBoundingClientRect();
      mouseStart.x = e.clientX - rect.left;
      mouseStart.y = e.clientY - rect.top;
      dragOrigin.x = camera.x;
      dragOrigin.y = camera.y;
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      mousePos.x = mouseX;
      mousePos.y = mouseY;
      if (isDragging) {
        camera.x = dragOrigin.x - (mouseX - mouseStart.x) / camera.zoom;
        camera.y = dragOrigin.y - (mouseY - mouseStart.y) / camera.zoom;
      }
    });
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      camera.zoom = Math.max(0.2, Math.min(4, camera.zoom * zoomFactor));
    });

    return () => {
      window.removeEventListener('resize', initCanvas);
    };
  });
</script>

<style>
  #container {
    width: 100vw;
    height: 100vh;
    position: relative;
  }
  #canvas {
    display: block;
    cursor: grab;
  }
  #canvas:active {
    cursor: grabbing;
  }
  #sidebar {
    position: absolute;
    left: 20px;
    top: 20px;
    background: rgba(0, 0, 0, 0.85);
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    z-index: 100;
    max-width: 320px;
    color: white;
  }
  #controls {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.85);
    padding: 15px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    z-index: 100;
  }
  #stats {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    padding: 15px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    z-index: 100;
    min-width: 150px;
    color: white;
  }
  button {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    margin: 3px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
  }
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  button.active {
    background: linear-gradient(45deg, #f093fb, #f5576c);
  }
  .cluster-info {
    display: flex;
    align-items: center;
    margin: 8px 0;
    padding: 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
  }
  .cluster-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }
  .cluster-stats {
    font-size: 12px;
    opacity: 0.8;
  }
  .tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 13px;
    pointer-events: none;
    z-index: 200;
    display: none;
    max-width: 250px;
    backdrop-filter: blur(10px);
  }
  h3 {
    margin: 0 0 15px 0;
    color: #4fc3f7;
    font-size: 18px;
  }
  .stat-item {
    display: flex;
    justify-content: space-between;
    margin: 5px 0;
    font-size: 13px;
  }
  .stat-value {
    color: #4fc3f7;
    font-weight: bold;
  }
</style>

<div id="container">
  <canvas id="canvas" bind:this={canvas}></canvas>
  <div id="sidebar">
    <h3>Knowledge Graph Clusters</h3>
    <div class="cluster-info">
      <div class="cluster-color" style="background: #00bcd4;"></div>
      <div>
        <strong>Equations & Laws</strong>
        <div class="cluster-stats">42 nodes • Mathematical formulations</div>
      </div>
    </div>
    <div class="cluster-info">
      <div class="cluster-color" style="background: #ff9800;"></div>
      <div>
        <strong>Variables & Units</strong>
        <div class="cluster-stats">38 nodes • Parameters & measurements</div>
      </div>
    </div>
    <div class="cluster-info">
      <div class="cluster-color" style="background: #e91e63;"></div>
      <div>
        <strong>Concepts & Entities</strong>
        <div class="cluster-stats">45 nodes • Abstract & concrete objects</div>
      </div>
    </div>
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
      <strong>Total Network:</strong> 125 nodes, ~180 edges
    </div>
  </div>
  <div id="controls">
    <button on:click={toggleAnimation}>{isAnimating ? 'Pause Animation' : 'Resume Animation'}</button>
    <button on:click={resetView}>Reset View</button>
    <button on:click={toggleClusters}>{showClusters ? 'Hide Clusters' : 'Show Clusters'}</button>
    <br>
    <button class:active={focusedCluster === 0} on:click={() => focusCluster(0)}>Focus Equations</button>
    <button class:active={focusedCluster === 1} on:click={() => focusCluster(1)}>Focus Variables</button>
    <button class:active={focusedCluster === 2} on:click={() => focusCluster(2)}>Focus Concepts</button>
    <button class:active={focusedCluster === -1} on:click={() => focusCluster(-1)}>Show All</button>
  </div>
  <div id="stats">
    <div class="stat-item">
      <span>Zoom:</span>
      <span class="stat-value">{zoomLevel.toFixed(1)}x</span>
    </div>
    <div class="stat-item">
      <span>Visible Nodes:</span>
      <span class="stat-value">{visibleNodes}</span>
    </div>
    <div class="stat-item">
      <span>Connections:</span>
      <span class="stat-value">{edgeCount}</span>
    </div>
    <div class="stat-item">
      <span>FPS:</span>
      <span class="stat-value">{fps}</span>
    </div>
  </div>
  <div bind:this={tooltip} class="tooltip"></div>
</div>