export const sparqlQueryLinks = `
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