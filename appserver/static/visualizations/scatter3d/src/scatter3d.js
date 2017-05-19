define([
        'jquery',
        'underscore',
        'api/SplunkVisualizationBase',
        'api/SplunkVisualizationUtils',
        'plotly.js'
    ],
    function(
        $,
        _,
        SplunkVisualizationBase,
        SplunkVisualizationUtils,
        Plotly
    ) {

        return SplunkVisualizationBase.extend({

            initialize: function() {
                SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
                this.id = _.uniqueId('scatter3d');
                this.$el = $(this.el);
                this.$el.append('<div id="' + this.id + '" class="splunk-scatter3d"></div>');
                var req;
            },

            // Implement updateView to render a visualization.
            //  'data' will be the data object returned from formatData or from the search
            //  'config' will be the configuration property object
            updateView: function(data, config) {

                // clear for re-draw
                $('#' + this.id).empty()

                // splunk colors
                var colorList = ['#1e93c6',
                    '#f2b827',
                    '#d6563c',
                    '#6a5c9e',
                    '#31a35f',
                    '#ed8440',
                    '#3863a0',
                    '#a2cc3e',
                    '#cc5068',
                    '#73427f'
                ];

                // get user defined colors
                try {
                    this.colors = config['display.visualizations.custom.scatterplot3d_app.scatter3d.colors']
                        .split(/\s|,/)
                } catch (e) {
                    this.colors = colorList;
                }

                // Legend handling
                var userLegend = config['display.visualizations.custom.scatterplot3d_app.scatter3d.showLegend'];
                if (userLegend === "0") {
                    userLegend = Boolean(parseInt(userLegend));
                } else {
                    userLegend = true;
                }

                var layout = {
                    showlegend: userLegend,
                    margin: {
                        l: 15,
                        r: 15,
                        b: 15,
                        t: 15
                    },
                    height: this.$el.height(),
                    width: this.$el.width(),
                    scene: {
                        aspectmode: config['display.visualizations.custom.scatterplot3d_app.scatter3d.aspectMode'] || 'auto',
                        aspectratio: {
                            x: config['display.visualizations.custom.scatterplot3d_app.scatter3d.xAspectRatio'],
                            y: config['display.visualizations.custom.scatterplot3d_app.scatter3d.yAspectRatio'],
                            z: config['display.visualizations.custom.scatterplot3d_app.scatter3d.zAspectRatio']
                        },
                        bgcolor: config['display.visualizations.custom.scatterplot3d_app.scatter3d.bgColor'],
                        xaxis: {
                            title: config['display.visualizations.custom.scatterplot3d_app.scatter3d.xTitle'] || config['display.visualizations.custom.scatterplot3d_app.scatter3d.x']
                        },
                        yaxis: {
                            title: config['display.visualizations.custom.scatterplot3d_app.scatter3d.yTitle'] || config['display.visualizations.custom.scatterplot3d_app.scatter3d.y']
                        },
                        zaxis: {
                            title: config['display.visualizations.custom.scatterplot3d_app.scatter3d.zTitle'] || config['display.visualizations.custom.scatterplot3d_app.scatter3d.z']
                        }
                    }

                };


                // Here is where we grab user's settings OR input the defaults
                if (data.length) {
                    for (var m = 0; m < data.length; m++) {
                        data[m]['marker']['size'] = parseFloat(config['display.visualizations.custom.scatterplot3d_app.scatter3d.size']) || 8;
                        data[m]['marker']['opacity'] = parseFloat(config['display.visualizations.custom.scatterplot3d_app.scatter3d.opacity']) || 0.8;
                        data[m]['marker']['symbol'] = config['display.visualizations.custom.scatterplot3d_app.scatter3d.symbol']
                        data[m]['marker']['line']['color'] = config['display.visualizations.custom.scatterplot3d_app.scatter3d.lineColor'] || 'black';

                        var userLineWidth = parseFloat(config['display.visualizations.custom.scatterplot3d_app.scatter3d.lineWidth'])
                        data[m]['marker']['line']['width'] = userLineWidth === 0 ? -1 : userLineWidth || 1
                    }
                }

                Plotly.newPlot(
                    this.$el.children('.splunk-scatter3d')[0],
                    data,
                    layout,

                    // full options can be found here:
                    // https://github.com/plotly/plotly.js/blob/master/src/plot_api/plot_config.js#L22-L86
                    {
                        showLink: false,
                        displaylogo: false,

                        // buttons to remove can be found here:
                        // https://github.com/plotly/plotly.js/blob/e39244de7791c58656e6bfdd4c5eb0aa435c7990/src/components/modebar/buttons.js
                        modeBarButtonsToRemove: ['sendDataToCloud', 'resetCameraLastSave3d']
                    });

                id = this.$el.children('.splunk-scatter3d')[0].id

                var smoothness = config['display.visualizations.custom.scatterplot3d_app.scatter3d.smoothness'] || 10000
                var speed = config['display.visualizations.custom.scatterplot3d_app.scatter3d.speed'] || 0.5
                var rotate = config['display.visualizations.custom.scatterplot3d_app.scatter3d.rotate']
                var rotate = rotate === "1" ? true : false
                console.log('outer')
                console.log(rotate)

                // Counter
                var i = 0

                function update(i) {
                    Plotly.animate(id, {
                        layout: {
                            scene: {
                                camera: {
                                    eye: {
                                        x: Math.cos(2 * Math.PI * i / smoothness) * 2,
                                        y: Math.sin(2 * Math.PI * i / smoothness) * 2,
                                        z: Math.sin(2 * Math.PI * i / smoothness) * 2,
                                    }
                                }
                            }
                        }
                    }, {
                        transition: {
                            duration: 0
                        },
                        frame: {
                            duration: 0,
                            redraw: false,
                        }
                    })

                    function sleep(ms) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    }

                    // Slow down sonny
                    sleep(speed * 20000)

                    // Increment &/or reset counter
                    i += 0.1
                    if (i == smoothness) {
                        i = 0
                    }
                    
                    // RECUSION IS BROKEN

                    console.log('inner')
                    console.log(rotate)
                    if (rotate){
                        req = requestAnimationFrame(update)
                    } else { return }
                }

                if (rotate) {
                    req = requestAnimationFrame(update)
                } else if (req != null) {
                    cancelAnimationFrame(req)
                }


            },

            // Search data params
            getInitialDataParams: function() {
                return ({
                    outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                    count: 20000
                });
            },

            // Optionally implement to format data returned from search.
            // The returned object will be passed to updateView as 'data'
            formatData: function(data, config) {

                if (data.rows.length) {
                    var fieldsLength = data.fields.length;
                    var rowsLength = data.rows.length;
                    var fields = data.fields;
                    var rows = data.rows;
                }

                if (rowsLength) {
                    config['display.visualizations.custom.scatterplot3d_app.scatter3d.x'] = fields[1]['name']
                    config['display.visualizations.custom.scatterplot3d_app.scatter3d.y'] = fields[2]['name']
                    config['display.visualizations.custom.scatterplot3d_app.scatter3d.z'] = fields[3]['name']
                }

                ////////////////////////
                //// ERROR CHECKING ////
                ////////////////////////

                // Check for invalid data
                if (rowsLength) {
                    var datumX = parseFloat(data.rows[0][1]);
                    var datumY = parseFloat(data.rows[0][2]);
                    var datumZ = parseFloat(data.rows[0][3]);
                    if (_.any([datumX, datumY, datumZ], isNaN)) {
                        throw new SplunkVisualizationBase.VisualizationError(
                            'The second, third, and fourth column must be numeric'
                        );
                    }
                }

                // Throw Error if too many rows
                if (rowsLength > 20000) {
                    throw new SplunkVisualizationBase.VisualizationError(
                        'Row limit exceeded: 20,000'
                    );
                }


                // Thorw Error if too many fields
                if (fieldsLength > 4) {
                    throw new SplunkVisualizationBase.VisualizationError(
                        'Column limit exceeded: 4 (category, x, y, z)'
                    );
                }

                ////////////////////////
                //// LE FORMAT DATA ////
                ////////////////////////

                // Please make sound effects for yourself as necessary

                var transformed = [];

                // ugly I know:
                // get the unique values of the
                // categorical field, assuming the field is the
                // first field/column in the data

                // why first field?
                // becuase that is how the stats function formats our data
                // which is the most likely command used to generate this data


                var categoricalValues = [];
                var transformed = [];


                _.each(rows, function(r) {
                    // get unique categoricalValues
                    if (categoricalValues.indexOf(r[0]) === -1) {
                        categoricalValues.push(r[0]);
                    }
                })

                // throw error if too many categorical values
                if (categoricalValues.length > 20) {
                    throw new SplunkVisualizationBase.VisualizationError(
                        'Categorical value limit exceeded: 20')
                }

                for (var cv = 0; cv < categoricalValues.length; cv++) {

                    // for each categorical value with index cv
                    // create a new array in data holder
                    transformed[cv] = new Array();

                    for (var i = 1; i < 4; i++) {

                        // for every dimension with index i
                        // create a new list
                        var series = [];

                        for (var r = 0; r < rowsLength; r++) {

                            if (rows[r][0] === categoricalValues[cv]) {

                                // for every row with index r
                                // loop through data points

                                for (var p = 0; p < fieldsLength; p++) {

                                    // for every point with index p
                                    // if index of field == index of point

                                    if (p == i) {

                                        // push the point to the proper list
                                        series.push(rows[r][p])
                                    }
                                }
                            }
                        }

                        transformed[cv].push(series)
                    }
                }

                // container for finalized traces
                var plotlyData = [];

                for (var t = 0; t < transformed.length; t++) {
                    // for each column of the data we make a new trace


                    // I put defaults in here but they get overwritten in updateView
                    // its just to have the keys in the trace
                    var currentTrace = {
                        name: fields[0]['name'] + ': ' + categoricalValues[t],
                        x: transformed[t][0],
                        y: transformed[t][1],
                        z: transformed[t][2],
                        mode: 'markers',
                        marker: {
                            color: this.colors[t],
                            size: 6,
                            symbol: 'circle',
                            line: {
                                color: 'black',
                                width: 1
                            },
                            opacity: 0.9
                        },
                        type: 'scatter3d'
                    };

                    plotlyData.push(currentTrace)
                }

                return plotlyData;
            },
            // Override to respond to re-sizing events
            reflow: function() {
                //If size changed, redraw.
                if ($('#' + this.id).height() !== this.$el.height()) {
                    $('#' + this.id).height(this.$el.height())
                    this.invalidateUpdateView();
                }

                if ($('#' + this.id + ' .svg-container').width() !== this.$el.width()) {
                    $('#' + this.id + ' .svg-container').width(this.$el.width())
                    this.invalidateUpdateView();
                }
            }
        });
    });
