/**
 * Created by emptysamurai on 25-Aug-15.
 */

define(['models/Gear', 'models/Shaft', 'geometry/Cylinder'], function (Gear, Shaft, Cylinder) {

    function SpurGear(params, shaft, parentGear) {
        Gear.call(this, params, shaft, parentGear);
        this.diametralPitch = params.diametralPitch;
        this.pressureAngle = params.pressureAngle;
        this.pitchCircleDiameter = this.teeth / this.diametralPitch;
        this.baseCircleRadius = this.pitchCircleDiameter * Math.cos(this.pressureAngle) / 2;
        this.addendumCircleRadius = (this.teeth + 2) / this.diametralPitch / 2;
        this.addendumAngle = Math.sqrt(this.addendumCircleRadius * this.addendumCircleRadius - this.baseCircleRadius * this.baseCircleRadius) / this.baseCircleRadius;
        this.rootRadius = (this.teeth - 2) / this.diametralPitch / 2;
        if (this.rootRadius <= this.innerRadius) {
            throw new Error("Inner radius larger than root diameter");
        }
        var o = this;
        var intersections = [];
        var checkIntersection = function (e) {
            if (e != shaft && e != parentGear) {
                if (o.intersects(e)) {
                    intersections.push(e);
                }
            }
        };
        if (parentGear) {
            parentGear.iterate(checkIntersection);
        } else if (shaft) {
            shaft.iterate(checkIntersection);
        }
        if (intersections.length > 0) {
            throw new Error("Spur gear is intersecting");
        }

    }

    SpurGear.prototype = Gear.prototype;

    SpurGear.prototype.toCylinder = function () {
        return new Cylinder(this.position.toArray(), this.axis.toArray(), this.addendumCircleRadius, this.width);
    };

    /**
     * Connects new gear to shaft
     * @param shaft Shaft to connect
     * @param params Gear parameters: teeth, width, diametral pitch, pressure angle
     * @param position Position of the gear (will be projected to the axis)
     */
    SpurGear.connectToShaft = function (shaft, params, position) {
        position.projectOnVector(shaft.axis);
        params.position = position;
        params.speed = shaft.speed;
        params.axis = shaft.axis;
        params.clockwise = shaft.clockwise;
        params.angle = 0;
        params.innerRadius = shaft.radius;
        var gear = new SpurGear(params, shaft, null);
        shaft.gears.push(gear);
        return gear;
    };

    /**
     *
     * @param params Object containing teeth, inner radius
     * @param direction The direction of connection *
     * @param up the up of the 3d object
     * @return {SpurGear} connected gear
     */
    SpurGear.prototype.connectGear = function (params, direction) {
        params.teeth = Math.max(4, params.teeth);
        params.speed = this.speed * this.teeth / params.teeth;
        params.clockwise = !this.clockwise;
        var up = this.up;
        direction.normalize();
        up.normalize();
        var jointAngle = Math.acos(direction.dot(up));
        var cross = new THREE.Vector3().crossVectors(direction, up);
        if (this.axis.dot(cross) < 0) {
            jointAngle = -jointAngle;
        }
        jointAngle = this.clockwise ? jointAngle : -jointAngle;
        var ratio = this.teeth / params.teeth;
        /*
         Suppose that initially upper tooth is centered by Y axis
         1. Firstly let's imagine that gears' centers are on Y axis and driven gear is above driver gear
         Now we rotate driven gear 180deg so upper tooth become down tooth and is centered by Y axis
         Then we rotate driven gear by half of an angle between teeth so the driver's upper tooth will be exactly between two driven's teeth
         If driver was rotated by some angle than driven should be rotated by the same angle multiplied by ratio
         2. Now there is a joint angle - an angle between Y axis and line connecting gears' centers. If driver rotates clockwise it's positive otherwise not.
         We will try to 'imitate' the situation that was in section 1.
         Firstly we 'rotate' driver gear by -joint angle
         Then we 'rotate' the driven gear by -joint angle
         */
        params.angle = Math.PI + 2 * Math.PI / params.teeth / 2 + (this.angle - jointAngle) * ratio - jointAngle;
        params.diametralPitch = this.diametralPitch;
        params.pressureAngle = this.pressureAngle;
        var distance = ((this.teeth + params.teeth) / this.diametralPitch) / 2;
        params.position = this.position.clone().add(direction.multiplyScalar(distance));
        params.axis = this.axis.clone();
        params.width = this.width;
        params.radius = params.innerRadius;
        params.length = this.width * 3;
        var shaft = new Shaft(params, this);
        var gear = new SpurGear(params, shaft, this);
        this.gears.push(gear);
        return gear;
    };

    return SpurGear;
});