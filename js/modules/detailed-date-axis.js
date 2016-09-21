/**********************************
 * Highcharts DetailedDate module *
 **********************************/
(function (H) {

	/**
	 * Add custom date formats
	 */
	H.dateFormats = {
		// Week number
		W: function (timestamp) {
			var date = new Date(timestamp),
				day = date.getUTCDay() === 0 ? 7 : date.getUTCDay(),
				dayNumber;
			date.setDate(date.getUTCDate() + 4 - day);
			dayNumber = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 1, -6)) / 86400000);
			return 1 + Math.floor(dayNumber / 7);
		},
		// First letter of the day of the week, e.g. 'M' for 'Monday'.
		E: function (timestamp) {
			return Highcharts.dateFormat('%a', timestamp, true).charAt(0);
		}
	};

	/**
	 * Center tick labels vertically and horizontally between ticks
	 */
	H.wrap(H.Tick.prototype, 'getLabelPosition', function (proceed, x, y, label, horiz, labelOptions, tickmarkOffset, index, step) {
		var returnValue,
			newPos,
			axisHeight,
			fontSize,
			labelMetrics;

		// Only center tick labels if axis has option grid: true
		if (this.axis.options.grid) {
			// Calculate x position
			newPos = this.pos + this.axis.options.tickInterval / 2;
			x = this.axis.translate(newPos) + this.axis.left;

			// Calculaye y position
			axisHeight = this.axis.axisGroup.getBBox().height;
			fontSize = this.axis.options.labels.style.fontSize;
			labelMetrics = this.axis.chart.renderer.fontMetrics(fontSize, label);
			y = y - (axisHeight / 2) + (labelMetrics.h / 2) - (Math.abs(labelMetrics.h - labelMetrics.b));

			returnValue = { x: x, y: y };
		} else {
			returnValue = proceed.apply(this, Array.prototype.slice.call(arguments, 1));
		}

		return returnValue;
	});

	/**
	 * Prohibit timespans of multitudes of a time unit
	 * and draw a grid.
	 */
	H.wrap(H.Chart.prototype, 'render', function (proceed) {
		var renderer = this.renderer,
			axis;

		// Get the topmost datetime xAxis
		H.each(this.axes, function (chartAxis) {
			// 25 is optimal height for default fontSize (11px)
			// 25 / 11 ≈ 2.28
			var fontSizeToCellHeightRatio = 25 / 11,
				fontSize,
				fontMetrics;

			if (chartAxis.options.grid) {
				axis = chartAxis;
				fontSize = axis.options.labels.style.fontSize;
				fontMetrics = axis.chart.renderer.fontMetrics(fontSize);

				// Prohibit timespans of multitudes of a time unit,
				// e.g. two days, three weeks, etc.
				axis.options.units = [
					['millisecond', [1]],
					['second', [1]],
					['minute', [1]],
					['hour', [1]],
					['day', [1]],
					['week', [1]],
					['month', [1]],
					['year', null]
				];

				// Make tick marks taller, creating cell walls of a grid.
				// Use cellHeight axis option if set
				axis.options.tickLength = axis.options.cellHeight || fontMetrics.h * fontSizeToCellHeightRatio;

				/**
				 * Axis lines start at first tick
				 */
				H.wrap(axis, 'getLinePath', function (proceed, lineWidth) {
					var returnValue = proceed.apply(this, Array.prototype.slice.call(arguments, 1)),
						xStart = returnValue.indexOf('M') + 1,
						firstTick = this.ticks[Object.keys(this.ticks)[0]],
						firstTickPos = firstTick ? firstTick.pos : this.getExtremes().min;

					returnValue[xStart] = this.translate(firstTickPos) + this.left;

					return returnValue;
				});
			}
		});

		// Only alter axis lines if there was an axis with grid: true
		if (axis !== undefined) {

			/**
			 * Draw a top line above the axis, creating cell roofs of a grid
			 */
			H.wrap(axis, 'render', function (proceed) {
				var distance,
					lineWidth,
					linePath,
					yStart,
					yEnd;

				// Call original Axis.render() to obtain this.axisLine and this.axisGroup
				proceed.apply(this);

				if (axis.axisLine) {
					// -1 to avoid adding distance each time the chart updates
					distance = axis.axisGroup.getBBox().height - 1;
					lineWidth = axis.options.lineWidth;

					if (lineWidth) {
						linePath = axis.getLinePath(lineWidth);
						yStart = linePath.indexOf('M') + 2;
						yEnd = linePath.indexOf('L') + 2;

						linePath[yStart] = linePath[yStart] - distance;
						linePath[yEnd] = linePath[yEnd] - distance;

						if (!axis.axisLineTop) {
							axis.axisLineTop = renderer.path(linePath)
								.attr({
									stroke: axis.options.lineColor,
									'stroke-width': lineWidth,
									zIndex: 7
								})
								.add(axis.axisGroup);
						} else {
							axis.axisLineTop.animate({
								d: linePath
							});
						}

						// show or hide the line depending on options.showEmpty
						axis.axisLine[axis.showAxis ? 'show' : 'hide'](true);
					}
				}
			});
		}
		// Call original Chart.render()
		proceed.apply(this);
	});

}(Highcharts));