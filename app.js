require([
    "esri/portal/Portal",
    "esri/identity/OAuthInfo",
    "esri/identity/IdentityManager",
    "esri/portal/PortalQueryParams",
    "esri/WebMap",
    "esri/views/MapView",
    "esri/widgets/Bookmarks",
    "esri/widgets/LayerList",
    "esri/widgets/Expand"
], function(Portal, OAuthInfo, esriId, PortalQueryParams, WebMap, MapView, Bookmarks, LayerList, Expand) {

    
    // let info = new OAuthInfo({
    //     // Swap this ID out with registered application ID
    //     appId: "XP6yuXAzKGZF6Ym5",
    //     // Uncomment the next line and update if using your own portal
    //     // portalUrl: "https://ral.maps.arcgis.com/arcgis"
    //     // Uncomment the next line to prevent the user's signed in state from being shared with other apps on the same domain with the same authNamespace value.
    //     // authNamespace: "portal_oauth_inline",
    //     popup: false
    // });

    // esriId.registerOAuthInfos([info]);
    // esriId
    // .checkSignInStatus(info.portalUrl + "/sharing")
    // .catch(/*give user an option to sign in*/);

    // esriId.getCredential(info.portalUrl + "/sharing");

  let map = new WebMap({
      portalItem: {
          id: 'af7470f8137c42c38bb6d449f6eb0f89'
      }
  });

  let parksLayer;
  let gwLayer;

  
  let view = new MapView({
      container: "viewDiv",
      map: map
    });

    view.when(function () {
        //############
        //## Layers ##
        //############
        parksLayer = map.allLayers.find(layer => {
            if (layer.title === 'All Raleigh Park Properties') {
                return layer
            }
        });

        gwLayer = map.allLayers.find(layer => {
            if (layer.title === 'Raleigh Greenways') {
                return layer
            }
        });

        let initialStatsQuery = parksLayer.createQuery()
        initialStatsQuery.where = filterStateInfos.full.query;
        initialStatsQuery.outStatistics = filterStateInfos.full.statsDefinitions
        parksLayer.queryFeatures(initialStatsQuery)
            .then(response => {
                let queryResults = response.features;
                acreageListEl.innerHTML = `
                <li>Total: ${round_to_precision(queryResults[0].attributes.acreage, 2)}</li>
                `
            })
    })

    const layerList = new LayerList({
        view: view
    });
    const llExpand = new Expand({
        view: view,
        content: layerList,
        expanded: false
    });
    view.ui.add(llExpand, "top-right");
    
    const bookmarks = new Bookmarks({
        view: view
    });
    const bkExpand = new Expand({
        view: view,
        content: bookmarks,
        expanded: false
    });
    view.ui.add(bkExpand, "top-right");


filterOptions.forEach(option => option.addEventListener('change', () => {
    activeFilterStateInfos = filterStateInfos[option.value] 
    parksLayer.renderer = activeFilterStateInfos.renderer
    setFeatureLayerViewFilter(view, parksLayer, activeFilterStateInfos.query)

    let statsQuery = parksLayer.createQuery()
    statsQuery.where = activeFilterStateInfos.query;
    statsQuery.outStatistics = activeFilterStateInfos.statsDefinitions
    statsQuery.groupByFieldsForStatistics = activeFilterStateInfos.groupByFieldsForStatistics
    parksLayer.queryFeatures(statsQuery)
        .then(response => {
            console.log(response.features)
            let queryResults = response.features
            if (option.value === 'full' | option.value === 'cps') {
                acreageListEl.innerHTML = `
                <li>Total: ${round_to_precision(queryResults[0].attributes.acreage, 2)}</li>
                `
            } else {
                let filterField = activeFilterStateInfos.groupByFieldsForStatistics[0]
                let acreageResults = queryResults.map(x => {
                    let rObj = {}
                    rObj[x.attributes[filterField]] = round_to_precision(x.attributes.acreage, 2)
                    return rObj
                }).reduce((k, v) => {
                    return Object.assign(k, v)
                }, {})
                acreageListEl.innerHTML = `
                <li style="color:${colors.primary};">Included: ${acreageResults.y}</li>
                <li style="color:${colors.secondary};">Excluded: ${acreageResults.n}</li>
                `
            }
        })

}))


});

const filterOptions = document.getElementsByName("filters")
const includedValueEl = document.getElementById("included-value")
const excludedValueEl = document.getElementById("excluded-value")
const acreageListEl = document.getElementById('acreage-list')

function setFeatureLayerViewFilter(view, layer, expression) {
    view.whenLayerView(layer).then(featureLayerView => {
        featureLayerView.filter = {
            where: expression
        }
    })
}

function round_to_precision(x, precision) {
    let multiplier = 10**precision
    return Math.round(x * multiplier) / multiplier;
}

const colors = {
    primary: "#4CAF50",
    secondary: "#FDD835"
}
const filterStateInfos = {
    full: { 
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: colors.primary,
                outline: {
                    width: 0
                }
            }
        },
        query: '1=1',
        statsDefinitions: [
                {
                    onStatisticField: 'MAP_ACRES',
                    outStatisticFieldName: 'acreage',
                    statisticType: 'sum'
                }
            ],
        // groupByFieldsForStatistics: undefined
    },
    attr: {
        renderer: {
            type: "unique-value",
            field: 'attr_inclusion',
            uniqueValueInfos: [
                {
                    value: 'y',
                    symbol: {
                        type: "simple-fill",
                        color: colors.primary,
                        outline: {
                            width: 0
                        }
                    }
                }, {
                    value: 'n',
                    symbol: {
                        type: "simple-fill",
                        color: colors.secondary,
                        outline: {
                            width: 0
                        }
                    }
                }
            ]
        },
        query: '1=1',
        statsDefinitions: [
                {
                    onStatisticField: 'MAP_ACRES',
                    outStatisticFieldName: 'acreage',
                    statisticType: 'sum'
                }
            ],
        groupByFieldsForStatistics: ['attr_inclusion']
    },
    spatial: {
        renderer: {
            type: "unique-value",
            field: 'spatial_inclusion',
            uniqueValueInfos: [
                {
                    value: 'y',
                    symbol: {
                        type: "simple-fill",
                        color: colors.primary,
                        outline: {
                            width: 0
                        }
                    }
                }, {
                    value: 'n',
                    symbol: {
                        type: "simple-fill",
                        color: colors.secondary,
                        outline: {
                            width: 0
                        }
                    }
                }
            ]
        },
        query: "attr_inclusion='y'",
        statsDefinitions: [
                {
                    onStatisticField: 'MAP_ACRES',
                    outStatisticFieldName: 'acreage',
                    statisticType: 'sum'
                }
            ],
            groupByFieldsForStatistics: ['spatial_inclusion']
    },
    fuf: {
        renderer: {
            type: "unique-value",
            field: 'final_inclusion',
            uniqueValueInfos: [
                {
                    value: 'y',
                    symbol: {
                        type: "simple-fill",
                        color: colors.primary,
                        outline: {
                            width: 0
                        }
                    }
                }, {
                    value: 'n',
                    symbol: {
                        type: "simple-fill",
                        color: colors.secondary,
                        outline: {
                            width: 0
                        }
                    }
                }
            ]
        },
        query: "1=1",
        statsDefinitions: [
                {
                    onStatisticField: 'MAP_ACRES',
                    outStatisticFieldName: 'acreage',
                    statisticType: 'sum'
                }
            ],
            groupByFieldsForStatistics: ['final_inclusion']
    },
    cps: {
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: colors.primary,
                outline: {
                    width: 0
                }
            }
        },
        query: "final_inclusion='y'",
        statsDefinitions: {
                onStatisticField: 'MAP_ACRES',
                outStatisticFieldName: 'acreage',
                statisticType: 'sum'
        },
        groupByFieldsForStatistics: undefined
    }
}