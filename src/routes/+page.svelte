<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { sparqlQueryLinks } from '$lib/queries/parentQuery.js';
  import { unitsQuery } from '$lib/queries/unitsQuery.js';
  import { fetchSparql } from '$lib/api/sparql.js';

  let tab = 'table';

  // Data and loading states for each query
  let results = [];
  let unitsResults = [];
  let loading = true;
  let loadingUnits = true;
  let error = null;

  // For graph node selection
  let selectedNodeId = null;
  let selectedNodeInfo = null;

  // Map for quick lookup of unit info by node id (quantity URI)
  let unitsMap = new Map();

  // Fetch all queries on mount
  onMount(async () => {
    try {
      // Fetch first query (links)
      const dataLinks = await fetchSparql(sparqlQueryLinks);
      results = dataLinks.results.bindings;
      loading = false;

      // Fetch units query
      const dataUnits = await fetchSparql(unitsQuery);
      unitsResults = dataUnits.results.bindings.map(row => ({
        quantity: row.quantity.value,
        quantityLabel: row.quantityLabel?.value ?? '',
        symbol: row.symbol?.value ?? '',
        units: row.units?.value ?? '',
        concepts: row.concepts?.value ?? ''
      }));
      loadingUnits = false;

      // Build unitsMap for fast lookup
      unitsMap = new Map();
      for (const row of unitsResults) {
        unitsMap.set(row.quantity, row);
      }

      // Draw graph if graph tab is active
      if (tab === 'graph' && results.length > 0) {
        setTimeout(drawGraph, 100);
      }
    } catch (err) {
      error = err.message;
      loading = false;
      loadingUnits = false;
    }
  });

  // Redraw graph when switching to graph tab
  $: if (tab === 'graph' && results.length > 0) {
    setTimeout(drawGraph, 100);
  }

  // Status indicator
  $: allLoaded = !loading && !loadingUnits;

  // Update selected node info when selectedNodeId changes
  $: if (selectedNodeId) {
    selectedNodeInfo = unitsMap.get(selectedNodeId) || null;
  } else {
    selectedNodeInfo = null;
  }

  // List of linkedTo elements for the selected node
  $: linkedToList = [];
  $: if (selectedNodeId && results.length > 0) {
    linkedToList = results
      .filter(row => row.item.value === selectedNodeId)
      .map(row => ({
        linkTo: row.linkTo.value,
        linkToLabel: row.linkToLabel?.value ?? ''
      }));
  } else {
    linkedToList = [];
  }

  // Reference to the SVG and simulation for zooming/focusing
  let svgElement;
  let simulationRef;
  let nodesRef = [];

  function drawGraph() {
    const width = 800;
    const height = 600;

    const nodesMap = new Map();
    const links = [];

    for (const row of results) {
      const itemId = row.item.value;
      const itemLabel = row.itemLabel?.value || itemId;
      const linkTo = row.linkTo.value;

      if (!nodesMap.has(itemId)) nodesMap.set(itemId, { id: itemId, label: itemLabel });
      if (!nodesMap.has(linkTo)) nodesMap.set(linkTo, { id: linkTo, label: linkTo });

      links.push({ source: itemId, target: linkTo });
    }

    const nodes = Array.from(nodesMap.values());
    nodesRef = nodes; // Save for focusing

    d3.select('#graph').selectAll('*').remove();

    svgElement = d3.select('#graph')
      .attr('width', width)
      .attr('height', height);

    const container = svgElement.append('g'); // Zoomable group

    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svgElement.call(zoom);

    simulationRef = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = container.append('g')
      .attr('stroke', '#aaa')
      .selectAll('line')
      .data(links)
      .enter().append('line');

    const node = container.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', 10)
      .attr('fill', d => d.id === selectedNodeId ? '#ff9800' : '#69b3a2')
      .attr('class', d => d.id === selectedNodeId ? 'highlighted' : '')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        selectedNodeId = d.id;
        setTimeout(() => {
          drawGraph();
          focusOnNode(d.id);
        }, 0);
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    const label = container.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text(d => d.label)
      .attr('font-size', 12)
      .attr('dx', 12)
      .attr('dy', 4);

    simulationRef.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Focus on selected node after drawing
    if (selectedNodeId) {
      setTimeout(() => focusOnNode(selectedNodeId), 100);
    }

    function dragstarted(event, d) {
      if (!event.active) simulationRef.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulationRef.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  // Focus/zoom on a node by id
  function focusOnNode(nodeId) {
    if (!svgElement || !nodesRef.length) return;
    const width = 800;
    const height = 600;
    const node = nodesRef.find(n => n.id === nodeId);
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') return;

    const scale = 1.5;
    const translate = [
      width / 2 - node.x * scale,
      height / 2 - node.y * scale
    ];

    svgElement.transition()
      .duration(500)
      .call(
        d3.zoom().transform,
        d3.zoomIdentity
          .translate(translate[0], translate[1])
          .scale(scale)
      );
  }

  // When clicking a linkedTo node in the infobox
  function selectAndFocusNode(nodeId) {
    selectedNodeId = nodeId;
    setTimeout(() => {
      drawGraph();
      focusOnNode(nodeId);
    }, 0);
  }
</script>

<!-- Page Title -->
<h1>Domain Browser</h1>
<!-- Status Indicator -->
<p>
  Status: 
  {#if allLoaded}
    <span style="color: green;">All SPARQL results loaded</span>
  {:else}
    <span style="color: orange;">Loading SPARQL results...</span>
  {/if}
</p>

<!-- Tab Navigation -->
<div>
  <button on:click={() => tab = 'table'} class:active={tab === 'table'}>📊 Table</button>
  <button on:click={() => tab = 'graph'} class:active={tab === 'graph'}>🕸 Graph</button>
  <button on:click={() => tab = 'units'} class:active={tab === 'units'}>Units & Symbols</button>
</div>

<!-- Main Content -->
{#if error}
  <p style="color: red;">Error: {error}</p>
{:else if tab === 'table'}
  {#if loading}
    <p>Loading...</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Label</th>
          <th>Link To</th>
        </tr>
      </thead>
      <tbody>
        {#each results as row}
          <tr>
            <td><a href={row.item.value} target="_blank">{row.item.value}</a></td>
            <td>{row.itemLabel?.value || '-'}</td>
            <td><a href={row.linkTo.value} target="_blank">{row.linkTo.value}</a></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:else if tab === 'graph'}
  <div class="graph-container">
    {#if loading}
      <p>Loading...</p>
    {:else}
      <svg id="graph"></svg>
      <div class="infobox">
        {#if selectedNodeId && selectedNodeInfo}
          <h3>Node Info</h3>
          <p><strong>Node ID:</strong> <a href={selectedNodeId} target="_blank">{selectedNodeId}</a></p>
          <p><strong>Quantity:</strong> {selectedNodeInfo.quantityLabel}</p>
          <p><strong>Symbol:</strong> {selectedNodeInfo.symbol}</p>
          <p><strong>Units:</strong> {selectedNodeInfo.units}</p>
          <p><strong>Concepts:</strong> {selectedNodeInfo.concepts}</p>
          <p><strong>Linked To:</strong>
            {#if linkedToList.length > 0}
              <ul>
                {#each linkedToList as link}
                  <li>
                    <button
                      class="linked-to-btn"
                      type="button"
                      on:click={() => selectAndFocusNode(link.linkTo)}
                    >
                      {link.linkToLabel || link.linkTo}
                    </button>
                  </li>
                {/each}
              </ul>
            {:else}
              <span>None</span>
            {/if}
          </p>
        {:else}
          <p>Select a node to see details.</p>
        {/if}
      </div>
    {/if}
  </div>
{:else if tab === 'units'}
  {#if loadingUnits}
    <p>Loading...</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Quantity</th>
          <th>Label</th>
          <th>Symbol</th>
          <th>Units</th>
          <th>Concepts</th>
        </tr>
      </thead>
      <tbody>
        {#each unitsResults as row}
          <tr>
            <td>{row.quantity}</td>
            <td>{row.quantityLabel}</td>
            <td>{row.symbol}</td>
            <td>{row.units}</td>
            <td>{row.concepts}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{/if}

<style>
  h1 {
    margin-bottom: 0.5rem;
  }
  button {
    padding: 0.5rem 1rem;
    margin-right: 0.5rem;
    font-weight: bold;
    border: none;
    background: #ddd;
    cursor: pointer;
  }

  button.active {
    background: #69b3a2;
    color: white;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  th, td {
    padding: 0.5rem;
    border: 1px solid #ccc;
  }

  th {
    background: #f0f0f0;
  }

  .graph-container {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    margin-top: 1rem;
  }

  svg#graph {
    width: 800px;
    height: 600px;
    border: 1px solid #ccc;
    background: white;
    flex-shrink: 0;
  }

  .infobox {
    margin-left: 2rem;
    padding: 1rem;
    border: 1px solid #bbb;
    background: #f9f9f9;
    min-width: 250px;
    max-width: 350px;
    border-radius: 8px;
    box-shadow: 0 2px 8px #0001;
  }

  .infobox h3 {
    margin-top: 0;
  }

  .highlighted {
    stroke: #ff9800 !important;
    stroke-width: 4px !important;
  }

  .linked-to-btn {
    background: none;
    border: none;
    color: #1976d2;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font: inherit;
  }
  .linked-to-btn:hover {
    color: #0d47a1;
  }
</style>
