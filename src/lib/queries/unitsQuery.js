export const unitsQuery = `
SELECT DISTINCT ?quantity ?quantityLabel ?symbol (GROUP_CONCAT(DISTINCT ?unitLabel; SEPARATOR = ", ") AS ?units) (GROUP_CONCAT(DISTINCT ?conceptLabel; SEPARATOR = ", ") AS ?concepts) WHERE {
  ?baseQuantity (wdt:P279*) wd:Q107715;
    (wdt:P2579*) wd:Q11473.
  ?quantity (wdt:P279*) ?baseQuantity.
  OPTIONAL { ?quantity wdt:P361 ?concept. }
  OPTIONAL { ?quantity wdt:P7973 ?symbol. }
  OPTIONAL {
    { ?quantity wdt:P8111 ?unit. }
    UNION
    { ?quantity wdt:P5061 ?unit. }
    UNION
    { ?quantity wdt:P2370 ?unit. }
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en".
    ?quantity rdfs:label ?quantityLabel.
    ?unit rdfs:label ?unitLabel.
    ?concept rdfs:label ?conceptLabel.
  }
  FILTER(BOUND(?quantityLabel))
}
GROUP BY ?quantity ?quantityLabel ?symbol
ORDER BY DESC (?unitCount) (?quantityLabel)
`;