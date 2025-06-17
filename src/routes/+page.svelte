<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { unitsQuery } from '$lib/queries/unitsQuery.js';
  import { fetchSparql } from '$lib/api/sparql.js';

  let results = [];
  let loading = true;
  let error = null;
  let tab = 'table';

  const endpointUrl = 'https://query.wikidata.org/sparql';

  const sparqlQueryLinks = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT DISTINCT ?item ?itemLabel ?linkTo WHERE {
      ?baseQuantity (wdt:P279*) wd:Q107715;
                  (wdt:P2579*) wd:Q11473.
      ?item (wdt:P279*) ?baseQuantity;
            (wdt:P279) ?linkTo.
      ?linkTo (wdt:P279*) wd:Q107715.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
  `;

  onMount(async () => {
    try {
      const url = endpointUrl + '?query=' + encodeURIComponent(sparqlQueryLinks);
      const response = await fetch(url, {
        headers: { 'Accept': 'application/sparql-results+json' }
      });

      if (!response.ok) throw new Error('SPARQL query failed');

      const json = await response.json();
      results = json.results.bindings;

      setTimeout(drawGraph, 100);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

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

    d3.select('#graph').selectAll('*').remove();

    const svg = d3.select('#graph')
      .attr('width', width)
      .attr('height', height);

    const container = svg.append('g'); // Zoomable group

    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation(nodes)
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
      .attr('fill', '#69b3a2')
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

    simulation.on('tick', () => {
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

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  $: if (tab === 'graph' && results.length > 0) {
    setTimeout(drawGraph, 100);
  }

  let activeTab = 0;
  let unitsResults = [];
  let loadingUnits = false;

  async function loadUnits() {
    loadingUnits = true;
    const data = await fetchSparql(unitsQuery);
    unitsResults = data.results.bindings.map(row => ({
      quantity: row.quantity.value,
      quantityLabel: row.quantityLabel?.value ?? '',
      symbol: row.symbol?.value ?? '',
      units: row.units?.value ?? '',
      concepts: row.concepts?.value ?? ''
    }));
    loadingUnits = false;
  }

  // Load units data when the third tab is selected
  $: if (activeTab === 2 && unitsResults.length === 0 && !loadingUnits) {
    loadUnits();
  }
</script>

<!-- Tab Navigation -->
<div>
  <button on:click={() => tab = 'table'} class:active={tab === 'table'}>📊 Table</button>
  <button on:click={() => tab = 'graph'} class:active={tab === 'graph'}>🕸 Graph</button>
</div>

<!-- Main Content -->
{#if loading}
  <p>Loading...</p>
{:else if error}
  <p style="color: red;">Error: {error}</p>
{:else}
  {#if tab === 'table'}
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
  {:else if tab === 'graph'}
    <svg id="graph"></svg>
  {/if}
{/if}

<div class="tabs">
  <button on:click={() => activeTab = 0}>First Query</button>
  <button on:click={() => activeTab = 1}>Second Query</button>
  <button on:click={() => activeTab = 2}>Units & Symbols</button>
</div>

{#if activeTab === 0}
  <!-- First query results -->
{/if}

{#if activeTab === 1}
  <!-- Second query results -->
{/if}

{#if activeTab === 2}
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

  svg#graph {
    width: 100%;
    height: 600px;
    border: 1px solid #ccc;
    margin-top: 1rem;
    background: white;
  }

  .tabs {
    margin-top: 1rem;
  }

  .tabs button {
    margin-right: 0.5rem;
  }
</style>
