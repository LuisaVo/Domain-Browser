

export async function fetchSparql(query) {
  const url = 'https://query.wikidata.org/sparql';
  const res = await fetch(url + '?query=' + encodeURIComponent(query), {
    headers: { Accept: 'application/sparql-results+json' }
  });
  return res.json();
}