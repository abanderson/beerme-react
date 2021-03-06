const express = require("express");
const router = express.Router();
const axios = require("axios");
const querystring = require("querystring");
const beerme = require("../beerme.js");
const demo = require("../demo.js");

router.get("/search", (req, res) => {
    // Build the Google Places API search query
    let googleSearchQuery = querystring.stringify({
        query: `${req.query.q} breweries`,
        key: process.env.GOOGLE_API_KEY
    });
    googleSearchQuery =
        "https://maps.googleapis.com/maps/api/place/textsearch/json?" +
        googleSearchQuery;

    // Search Google for breweries at the specified location and create
    // a list of 'brewery' objects storing the results
    axios
        .get(googleSearchQuery)
        .then(response => {
            let breweries = response.data.results.map(result => {
                let brewery = {};
                brewery.name = result.name;
                brewery.untappdName = result.name;
                brewery.address = result.formatted_address;
                brewery.latitude = result.geometry.location.lat;
                brewery.longitude = result.geometry.location.lng;
                return brewery;
            });
            return breweries;
        })
        // Then, feed the brewery names to the Untappd API to get
        // information about each brewery
        .then(breweries => {
            return Promise.all(
                breweries.map(brewery => {
                    return beerme.getUntappdBreweryDetails(brewery);
                })
            );
        })
        // Then, get information about the available beers at each
        // brewery
        .then(breweries => {
            // Filter out breweries that have no untappd id
            // This means a brewery matching the name returned by
            // Google was not found on Untappd
            breweries = breweries.filter(brewery => {
                return brewery.untappd_id != undefined;
            });

            return Promise.all(
                breweries.map(brewery => {
                    return beerme.getBeersForBrewery(brewery);
                })
            );
        })
        // Finally, send the brewery and beer list as JSON
        .then(breweries => res.json(breweries))
        .catch(error => {
            console.log(error);
            res.json({
                status: "error",
                message: "Failed to retrieve brewery data."
            });
        });
});

router.get("/demo", (req, res) => {
    res.json(demo.demoData);
});

module.exports = router;
