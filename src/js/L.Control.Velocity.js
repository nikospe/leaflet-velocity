L.Control.Velocity = L.Control.extend({
  options: {
    position: "bottomleft",
    emptyString: "Unavailable",
    // Could be any combination of 'bearing' (angle toward which the flow goes) or 'meteo' (angle from which the flow comes)
    // and 'CW' (angle value increases clock-wise) or 'CCW' (angle value increases counter clock-wise)
    angleConvention: "bearingCCW",
    // Could be 'm/s' for meter per second, 'k/h' for kilometer per hour or 'kt' for knots
    speedUnit: "m/s",
    onAdd: null,
    onRemove: null
  },

  onAdd: function(map) {
    this._container = L.DomUtil.create("div", "leaflet-control-velocity");
    L.DomEvent.disableClickPropagation(this._container);
    map.on("mousemove", this._onMouseMove, this);
    this._container.innerHTML = this.options.emptyString;
    if (this.options.leafletVelocity.options.onAdd)
      this.options.leafletVelocity.options.onAdd();
    return this._container;
  },

  onRemove: function(map) {
    map.off("mousemove", this._onMouseMove, this);
    if (this.options.leafletVelocity.options.onRemove)
      this.options.leafletVelocity.options.onRemove();
  },

  vectorToSpeed: function(uMs, vMs, unit) {
    var velocityAbs = Math.sqrt(Math.pow(uMs, 2) + Math.pow(vMs, 2));
    // Default is m/s
    if (unit === "k/h") {
      return this.meterSec2kilometerHour(velocityAbs);
    } else if (unit === "kt") {
      return this.meterSec2Knots(velocityAbs);
    } else {
      return velocityAbs;
    }
  },

  vectorToDegrees: function(uMs, vMs, angleConvention) {
    // Default angle convention is CW
    if (angleConvention.endsWith("CCW")) {
      // vMs comes out upside-down..
      vMs = vMs > 0 ? (vMs = -vMs) : Math.abs(vMs);
    }
    var velocityAbs = Math.sqrt(Math.pow(uMs, 2) + Math.pow(vMs, 2));

    var velocityDir = Math.atan2(uMs / velocityAbs, vMs / velocityAbs);
    var velocityDirToDegrees = (velocityDir * 180) / Math.PI + 180;

    if (angleConvention === "bearingCW" || angleConvention === "meteoCCW") {
      velocityDirToDegrees += 180;
      if (velocityDirToDegrees >= 360) velocityDirToDegrees -= 360;
    }

    return velocityDirToDegrees;
  },

  meterSec2Knots: function(meters) {
    return meters / 0.514;
  },

  meterSec2kilometerHour: function(meters) {
    return meters * 3.6;
  },

  degreesToSides: (value, type) => {
    if( (value >= 337 && value <= 359) || (value >= 0 && value <= 22) ) return (type === 'wind') ? 'South' : 'North';
    if( value > 22 && value <= 68 ) return (type === 'wind') ? 'South East' : 'North West';
    if( value > 68 && value <= 112 ) return (type === 'wind') ? 'East' : 'West';
    if( value > 112 && value <= 152 ) return (type === 'wind') ? 'North East' : 'South West';
    if( value > 152 && value <= 202 ) return (type === 'wind') ? 'North' : 'South';
    if( value > 202 && value <= 245 ) return (type === 'wind') ? 'North West' : 'South East';
    if( value > 245 && value <=  290 ) return (type === 'wind') ? 'West' : 'East';
    if( value > 290 && value <= 337 ) return (type === 'wind') ? 'South West' : 'North East';
    if( value > 22 && value <= 68 ) return (type === 'wind') ? 'South East' : 'North West';
},

msToBeauforts : value => {
  if( !value ) return '-';
  if( value < 0.5 ) return 0;
  if( value >= 0.5 && value <= 1.5 ) return 1;
  if( value > 1.5 && value <= 3.3 ) return 2;
  if( value > 3.3 && value <= 5.5 ) return 3;
  if( value > 5.5 && value <= 7.9 ) return 4;
  if( value > 7.9 && value <= 10.7 ) return 5;
  if( value > 10.7 && value <= 13.8 ) return 6;
  if( value > 13.8 && value <= 17.1 ) return 7;
  if( value > 17.1 && value <= 20.7 ) return 8;
  if( value > 20.7 && value <= 24.4 ) return 9;
  if( value > 24.4 && value <= 28.4 ) return 10;
  if( value > 28.4 && value <= 32.6 ) return 11;
  if( value > 32.6) return 12;
  return '-';
},

  roundToDigits: function(number, digits) {
    if(number === 0) return 0;
    if(!number || number === NaN || number === null) return null;
    return parseFloat(number.toFixed(digits));
  },

  _onMouseMove: function(e) {
    var self = this;
    var pos = this.options.leafletVelocity._map.containerPointToLatLng(
      L.point(e.containerPoint.x, e.containerPoint.y)
    );
    var gridValue = this.options.leafletVelocity._windy.interpolatePoint(
      pos.lng,
      pos.lat
    );
    var htmlOut = "";
    if(!gridValue) return;
    var direction = self.degreesToSides(self.vectorToDegrees(gridValue[0],gridValue[1],this.options.angleConvention), 'wind') + ' Wind';
    var speed = self.msToBeauforts(self.vectorToSpeed(gridValue[0],gridValue[1],this.options.speedUnit)) + ' Bf';
    var directionText = 'Wind Direction: ';
    var speedText = 'Wind Speed: ';

    if(this.options.velocityType.includes('Water')) {
        direction = self.degreesToSides(self.vectorToDegrees(gridValue[0],gridValue[1],this.options.angleConvention), 'currents');
        speed = self.roundToDigits(self.meterSec2Knots(self.vectorToSpeed(gridValue[0],gridValue[1],this.options.speedUnit)), 2) + ' Kn';
        directionText = 'Currents Direction: ';
        speedText = 'Currents Speed: '
    }

    if (
      gridValue &&
      !isNaN(gridValue[0]) &&
      !isNaN(gridValue[1]) &&
      gridValue[2]
    ) {
      htmlOut = "<strong>"+ directionText +"</strong>"+ direction +
        ", <strong>"+ speedText + "</strong>"+
        speed;
    } else {
      htmlOut = this.options.emptyString;
    }

    self._container.innerHTML = htmlOut;
  }
});

L.Map.mergeOptions({
  positionControl: false
});

L.Map.addInitHook(function() {
  if (this.options.positionControl) {
    this.positionControl = new L.Control.MousePosition();
    this.addControl(this.positionControl);
  }
});

L.control.velocity = function(options) {
  return new L.Control.Velocity(options);
};
