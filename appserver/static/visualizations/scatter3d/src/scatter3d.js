define([
  'jquery',
  'underscore',
  'api/SplunkVisualizationBase',
  'api/SplunkVisualizationUtils',
  'plotly.js'
],
  function (
    $,
    _,
    SplunkVisualizationBase,
    SplunkVisualizationUtils,
    Plotly
  ) {
    return SplunkVisualizationBase.extend({

      initialize: function () {
        SplunkVisualizationBase.prototype.initialize.apply(this, arguments)
        this.id = _.uniqueId('scatter3d')
        this.$el = $(this.el)
        this.$el.append('<div id="' + this.id + '" class="splunk-scatter3d"></div>')
        this.cam = undefined
        this.stale = false 
      },

      // Implement updateView to render a visualization.
      //  'data' will be the data object returned from formatData or from the search
      //  'config' will be the configuration property object
      updateView: function (data, config) {
        // clear for re-draw
        $('#' + this.id).empty()

        // splunk colors
        defaultColorList = [
          '#1e93c6',
          '#f2b827',
          '#d6563c',
          '#6a5c9e',
          '#31a35f',
          '#ed8440',
          '#3863a0',
          '#a2cc3e',
          '#cc5068',
          '#73427f'
        ]

        // get user defined colors
        var colors = config['display.visualizations.custom.scatterplot3d_app.scatter3d.colors'] || ''

        if (colors !== '') {
          try {
            var split = config['display.visualizations.custom.scatterplot3d_app.scatter3d.colors'].split(/\s+,?/)
            var validHex = /^#([0-9a-f]{6})$/igm
            var colors = []
            split.map(function (s) {
              hex = s.replace(/[^0-9A-F#]/gi, '')
              var match = hex.match(validHex)
              if (match == null) {
                throw new SplunkVisualizationBase.VisualizationError(
                  s + ' is not a valid color. There should be a preceeding # and 6 characters of [0-9A-Fa-f].'
                )
              }
              colors.push(match[0])
            })

            console.log('Using custom colors: ' + colors)
            this.colorList = colors
          } catch (e) {
            throw new SplunkVisualizationBase.VisualizationError('There was an error while parsing custom colors: ' + e)
          }
        } else {
          this.colorList = defaultColorList
        }

        // Get the colors from the viz
        var data = this.getCurrentData()
        var markers = _.pluck(data, "marker") 
        var dataColors = _.pluck(markers, "color")

        // If our config doesn't match the data, we need to update
        for (var i = 0; i < dataColors.length; i++) {
            if (dataColors[i] !== this.colorList[i]) {
                this.invalidateFormatData()
            }
        }

        // Legend handling
        var userLegend = config['display.visualizations.custom.scatterplot3d_app.scatter3d.showLegend']
        userLegend = userLegend !== '0'

        var defaultCamera = {
          eye: {
            x: 1.25,
            y: 1.25,
            z: 1.25
          },
          center: {
            x: 0,
            y: 0,
            z: 0
          },
          up: {
            x: 0,
            y: 0,
            z: 1
          }
        }

        try {
          // Capture the camera if it already exists with this monstrosity
          this.cam = this.$el.children('.splunk-scatter3d')[0]['_fullLayout']['scene']['_scene'].getCamera()
        } catch (e) {
          // if there is no camera, set it to the default
          this.cam = defaultCamera
        }

        // store whichever camera was taken into the config
        config['display.visualization.custom.scatterplot3d_app.scatter3d.camera'] = this.cam

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
            camera: config['display.visualization.custom.scatterplot3d_app.scatter3d.camera'],
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

        } // end of layout

        // Here is where we grab user's settings OR input the defaults
        if (data.length) {
          for (var m = 0; m < data.length; m++) {
            data[m]['marker']['size'] = parseFloat(config['display.visualizations.custom.scatterplot3d_app.scatter3d.size']) || 8
            data[m]['marker']['opacity'] = parseFloat(config['display.visualizations.custom.scatterplot3d_app.scatter3d.opacity']) || 0.8
            data[m]['marker']['symbol'] = config['display.visualizations.custom.scatterplot3d_app.scatter3d.symbol']
            data[m]['marker']['line']['color'] = config['display.visualizations.custom.scatterplot3d_app.scatter3d.lineColor'] || 'black'
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
          })

        // Grab options
        this.speed = config['display.visualizations.custom.scatterplot3d_app.scatter3d.speed'] || 1
        this.rotate = config['display.visualizations.custom.scatterplot3d_app.scatter3d.rotate'] || '0'
        this.i = config['display.visualizations.custom.scatterplot3d_app.scatter3d.i'] || 0

        // Convert
        this.speed = 10000 / parseFloat(this.speed)
        this.zoom = parseFloat(this.zoom)
        this.rotate = this.rotate === '1'

        // Counter
        var that = this

        var start = $.extend(true, {}, this.cam.eye)

        // var i = this.i;

        function update (i) {
          // recursive animation loop
          i += 0.1

          var speed = that.speed
          var innerRotate = that.rotate

          // Math is cool!
          var radius = Math.sqrt(Math.pow(start.x, 2) + Math.pow(start.y, 2))
          var cos = radius * Math.cos(2 * Math.PI * i / speed)
          var sin = radius * Math.sin(2 * Math.PI * i / speed)

          var innerEye = {
            x: cos,
            y: sin,
            z: start.z
          }

          Plotly.animate(that.id, {
            layout: {
              scene: {
                camera: {
                  eye: innerEye
                }
              }
            }
          }, {
            transition: {
              duration: 0
            },
            frame: {
              duration: 0,
              redraw: false
            }
          })

          // this is where the recursion starts
          if (innerRotate) {
            window.requestAnimationFrame(update)
          }
        }

        // start recursing
        if (this.rotate) {
          window.requestAnimationFrame(update)
        }
      },

      // Search data params
      getInitialDataParams: function () {
        return ({
          outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
          count: 50000
        })
      },

      // Optionally implement to format data returned from search.
      // The returned object will be passed to updateView as 'data'
      formatData: function (data, config) {
        if (data.rows.length) {
          var fieldsLength = data.fields.length
          var rowsLength = data.rows.length
          var fields = data.fields
          var rows = data.rows
        }

        if (rowsLength) {
          config['display.visualizations.custom.scatterplot3d_app.scatter3d.x'] = fields[1]['name']
          config['display.visualizations.custom.scatterplot3d_app.scatter3d.y'] = fields[2]['name']
          config['display.visualizations.custom.scatterplot3d_app.scatter3d.z'] = fields[3]['name']
        }

        var catLimit = config['display.visualizations.custom.scatterplot3d_app.scatter3d.catLimit']
        catLimit = parseInt(catLimit) || 20

        // //////////////////////
        // // ERROR CHECKING ////
        // //////////////////////

        // Check for invalid data
        if (rowsLength) {
          var datumX = parseFloat(data.rows[0][1])
          var datumY = parseFloat(data.rows[0][2])
          var datumZ = parseFloat(data.rows[0][3])
          if (_.any([datumX, datumY, datumZ], isNaN)) {
            throw new SplunkVisualizationBase.VisualizationError(
              'The second, third, and fourth column must be numeric'
            )
          }
        }

        // Throw Error if too many rows
        if (rowsLength > 50000) {
          throw new SplunkVisualizationBase.VisualizationError(
            'Row limit exceeded: 50,000'
          )
        }

        // Thorw Error if too many fields
        if (fieldsLength > 4) {
          throw new SplunkVisualizationBase.VisualizationError(
            'Column limit exceeded: 4 (category, x, y, z)'
          )
        }

        // //////////////////////
        // // LE FORMAT DATA ////
        // //////////////////////

        // Please make sound effects for yourself as necessary

        // ugly I know:
        // get the unique values of the
        // categorical field, assuming the field is the
        // first field/column in the data

        // why first field?
        // becuase that is how the stats function formats our data
        // which is the most likely command used to generate this data

        var categoricalValues = []
        var transformed = []

        _.each(rows, function (r) {
          // get unique categoricalValues
          if (categoricalValues.indexOf(r[0]) === -1) {
            categoricalValues.push(r[0])
          }
        })

        // throw error if too many categorical values
        if (categoricalValues.length > catLimit) {
          throw new SplunkVisualizationBase.VisualizationError(
            'Categorical value limit exceeded: ' + catLimit
            )
        }

        for (var cv = 0; cv < categoricalValues.length; cv++) {
          // for each categorical value with index cv
          // create a new array in data holder
          transformed[cv] = []

          for (var i = 1; i < 4; i++) {
            // for every dimension with index i
            // create a new list
            var series = []

            for (var r = 0; r < rowsLength; r++) {
              if (rows[r][0] === categoricalValues[cv]) {
                // for every row with index r
                // loop through data points

                for (var p = 0; p < fieldsLength; p++) {
                  // for every point with index p
                  // if index of field == index of point

                  if (p === i) {
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
        var plotlyData = []

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
              color: this.colorList[t],
              size: 6,
              symbol: 'circle',
              line: {
                color: 'black',
                width: 1
              },
              opacity: 0.9
            },
            type: 'scatter3d'
          }

          plotlyData.push(currentTrace)
        }

        return plotlyData
      },
      // Override to respond to re-sizing events
      reflow: function () {
        // If size changed, redraw.
        if ($('#' + this.id).height() !== this.$el.height()) {
          $('#' + this.id).height(this.$el.height())
          this.invalidateUpdateView()
        }

        if ($('#' + this.id + ' .svg-container').width() !== this.$el.width()) {
          $('#' + this.id + ' .svg-container').width(this.$el.width())
          this.invalidateUpdateView()
        }
      }
    })
  })
