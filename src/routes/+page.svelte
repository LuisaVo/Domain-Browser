<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  let results = [];
  let loading = true;
  let error = null;
  let tab = 'table'; // "table" or "graph"

  const endpointUrl = 'https://query.wikidata.org/sparql';

  const sparqlQuery = `
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
      const url = endpointUrl + '?query=' + encodeURIComponent(sparqlQuery);
      const response = await fetch(url, {
        headers: { 'Accept': 'application/sparql-results+json' }
      });

      if (!response.ok) throw new Error('SPARQL query failed');

      const json = await response.json();
      results = json.results.bindings;

      // Wait for results to render before drawing the graph
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

    d3.select('#graph').selectAll('*').remove(); // Clear previous

    const svg = d3.select('#graph')
      .attr('width', width)
      .attr('height', height);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('stroke', '#aaa')
      .selectAll('line')
      .data(links)
      .enter().append('line');

    const node = svg.append('g')
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

    const label = svg.append('g')
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

  // Redraw graph when tab is switched
  $: if (tab === 'graph' && results.length > 0) {
    setTimeout(drawGraph, 100);
  }
</script>

<div>
  <button on:click={() => tab = 'table'} class:active={tab === 'table'}>📊 Table</button>
  <button on:click={() => tab = 'graph'} class:active={tab === 'graph'}>🕸 Graph</button>
</div>

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
  }
</style>
