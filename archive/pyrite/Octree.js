var Octree = (function () {
    function Octree() {
        this.DEFAULT_MIN_SIZE = 1;
        this.minimumSize = this.DEFAULT_MIN_SIZE;
        this.objects = new Array(0);
        this.octants = new Array(0);
        this.insertionQueue = new Array(0);
        this.treeBuilt = false;
        this.treeReady = false;
        this.debruijnPosition = new Uint32Array([
            0,
            9,
            1,
            10,
            13,
            21,
            2,
            29,
            11,
            14,
            16,
            18,
            22,
            25,
            3,
            30,
            8,
            12,
            20,
            28,
            15,
            17,
            24,
            7,
            19,
            27,
            23,
            6,
            26,
            5,
            4,
            31
        ]);
        this.bitCheck = new Uint32Array([0x07C4ACDD]);
        this.region = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    }
    Octree.prototype.hasChildren = function () {
        return this.activeOctants != 0;
    };
    Octree.prototype.isEmpty = function () {
        if (this.objects.length != 0)
            return false;
        if (this.activeOctants != 0) {
            for (var a = 0; a < 8; a++) {
                if (this.octants[a] != null && !this.octants[a].isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    };
    Octree.prototype.isRoot = function () {
        return this.parent != null;
    };
    Octree.prototype.add = function (item) {
        this.insertionQueue.push(item);
        //if (this.insertionQueue.length > 5)
        //    this.update();
    };
    Octree.prototype.addMultiple = function (items) {
        var _this = this;
        items.forEach(function (i) {
            _this.insertionQueue.push(i);
        });
        //if (this.insertionQueue.length > 5)
        //    this.update();
    };
    Octree.prototype.insert = function (item) {
        if (this.objects.length <= 1 && this.activeOctants == 0) {
            this.objects.push(item);
            return;
        }
        var dimensions = this.region.max.sub(this.region.min);
        if (dimensions.x <= this.minimumSize && dimensions.y <= this.minimumSize && dimensions.z <= this.minimumSize) {
            this.objects.push(item);
            return;
        }
        var half = dimensions.divideScalar(2.0);
        var center = this.region.min.add(half);
        var childOctant = new Array(8);
        childOctant[0] = (this.octants[0] != null) ? this.octants[0].region : new THREE.Box3(this.region.min, center);
        childOctant[1] = (this.octants[1] != null) ? this.octants[1].region : new THREE.Box3(new THREE.Vector3(center.x, this.region.min.y, this.region.min.z), new THREE.Vector3(this.region.max.x, center.x, center.z));
        childOctant[2] = (this.octants[2] != null) ? this.octants[2].region : new THREE.Box3(new THREE.Vector3(center.x, this.region.min.y, center.z), new THREE.Vector3(this.region.max.x, center.x, this.region.max.z));
        childOctant[3] = (this.octants[3] != null) ? this.octants[3].region : new THREE.Box3(new THREE.Vector3(this.region.min.x, this.region.min.y, center.z), new THREE.Vector3(center.x, center.x, this.region.max.z));
        childOctant[4] = (this.octants[4] != null) ? this.octants[4].region : new THREE.Box3(new THREE.Vector3(this.region.min.x, center.x, this.region.min.z), new THREE.Vector3(center.x, this.region.max.y, center.z));
        childOctant[5] = (this.octants[5] != null) ? this.octants[5].region : new THREE.Box3(new THREE.Vector3(center.x, center.x, this.region.min.z), new THREE.Vector3(this.region.max.x, this.region.max.y, center.z));
        childOctant[6] = (this.octants[6] != null) ? this.octants[6].region : new THREE.Box3(center, this.region.max);
        childOctant[7] = (this.octants[7] != null) ? this.octants[7].region : new THREE.Box3(new THREE.Vector3(this.region.min.x, center.x, center.z), new THREE.Vector3(center.x, this.region.max.y, this.region.max.z));
        if (item.bounds.boundingBox.max != item.bounds.boundingBox.min && this.region.containsBox(item.bounds.boundingBox)) {
            var found = false;
            for (var i = 0; i < 8; i++) {
                if (childOctant[i].containsBox(item.bounds.boundingBox)) {
                    if (this.octants[i]) {
                        this.octants[i].insert(item);
                    }
                    else {
                        this.octants[i] = this.createNode(childOctant[i], [item]);
                        this.activeOctants |= (1 << i);
                    }
                    found = true;
                }
            }
            if (!found) {
                this.objects.push(item);
            }
        }
        else {
            this.build();
        }
    };
    Octree.prototype.nextPowerOfTwo = function (v) {
        v = v >>> 0;
        v--;
        // first round down to one less than a power of 2
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
        //var unsignedVal = (v * 0x07C4ACDD); // in JS, you have to do a zero-fill right shift from int to uint
        //// Debruijn sequence to find most significant bit position
        ////var shift = 27 >> 0;
        //var val = (v * 0x07C4ACDD) >>> 0 >> 27; 
        //var index = val >>> 0;
        //var r = this.debruijnPosition[val];
        //var r = mssb(v);
        //// Shift MSB left to find next power 2.
        //return 1 << (r + 1);
    };
    // This finds the dimensions of the bounding box necessary to tightly enclose all items in the object list.
    Octree.prototype.setEnclosingBox = function () {
        var globalMin = this.region.min;
        var globalMax = this.region.max;
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];
            var localMin = new THREE.Vector3();
            var localMax = new THREE.Vector3();
            if (obj.bounds.boundingBox.max != obj.bounds.boundingBox.min) {
                localMin = obj.bounds.boundingBox.min;
                localMax = obj.bounds.boundingBox.max;
            }
            if (localMin.x < globalMin.x) {
                globalMin.x = localMin.x;
            }
            if (localMin.y < globalMin.y) {
                globalMin.y = localMin.y;
            }
            if (localMin.z < globalMin.z) {
                globalMin.z = localMin.z;
            }
            if (localMax.x > globalMax.x) {
                globalMax.x = localMax.x;
            }
            if (localMax.y > globalMax.y) {
                globalMax.y = localMax.y;
            }
            if (localMax.z > globalMax.z) {
                globalMax.z = localMax.z;
            }
        }
        this.region.min = globalMin;
        this.region.max = globalMax;
    };
    Octree.prototype.setEnclosingCube = function () {
        this.setEnclosingBox();
        //find the min offset from (0,0,0) and translate by it for a short while
        var offset = this.region.min.sub(new THREE.Vector3());
        this.region.min.add(offset);
        this.region.max.add(offset);
        //find the nearest power of two for the max values
        var highX = Math.floor(Math.max(Math.max(this.region.max.x, this.region.max.y), this.region.max.z));
        for (var bit = 0; bit < 32; bit++) {
            if (highX == 1 << bit) {
                this.region.max = new THREE.Vector3(highX, highX, highX);
                this.region.min.sub(offset);
                this.region.max.sub(offset);
                return;
            }
        }
        //gets the most significant bit value, so that we essentially do a Ceiling(X) with the 
        //ceiling result being to the nearest power of 2 rather than the nearest integer.
        var x = this.nextPowerOfTwo(highX);
        this.region.max = new THREE.Vector3(x, x, x);
        this.region.min.sub(offset);
        this.region.max.sub(offset);
    };
    Octree.prototype.createNode = function (region, items) {
        var ret = new Octree();
        ret.minimumSize = this.minimumSize;
        ret.region = region;
        ret.parent = this;
        ret.addMultiple(items);
        ret.update();
        return ret;
    };
    Octree.prototype.allIntersections = function (box) {
        if (!this.treeReady) {
            this.update();
        }
        return this.getIntersection(box);
    };
    Octree.prototype.getIntersection = function (box) {
        if (this.objects.length == 0 && !this.hasChildren) {
            return null;
        }
        
        // handle contains
        if (box.containsBox(this.region)) {
            var intersections = new Array(this.allItems.length);
            for (var i = 0; i < intersections.length; i++) {
                intersections[i] = new Intersection(this.objects[i]);
            }
            ;
            return intersections;
        }
        var hitlist = new Array();
        // handle intersects
        if (box.isIntersectionBox(this.region)) {
            this.objects.forEach(function (o) {
                if (o.bounds.boundingBox.isIntersectionBox(box)) {
                    hitlist.push(new Intersection(o));
                }
            });
            if (this.octants.length > 0) {
                for (var i = 0; i < this.octants.length; i++) {
                    if (!this.octants[i])
                        continue;
                    var hitlist2 = this.octants[i].getIntersection(box);
                    if (hitlist2 && hitlist2.length > 0)
                        hitlist = hitlist.concat(hitlist2);
                }
            }
            
        }
        return hitlist;
    };
    Octree.prototype.allItems = function () {
        var allitems = Array();
        this.objects.forEach(function (o) {
            allitems.push(o);
        });
        for (var i = 0; i < 8; i++) {
            if (!this.octants[i])
                continue;
            this.octants[i].allItems().forEach(function (o) {
                allitems.push(o);
            });
        }
        return allitems;
    };
    Octree.prototype.update = function () {
        if (this.insertionQueue.length == 0)
            return;
        if (!this.treeBuilt) {
            while (this.insertionQueue.length != 0) {
                this.objects.push(this.insertionQueue.pop());
            }
            this.build();
        }
        else {
            while (this.insertionQueue.length != 0) {
                this.insert(this.insertionQueue.pop());
            }
        }
        this.treeReady = true;
    };
    Octree.prototype.build = function () {
        if (this.objects.length <= 1) {
            return;
        }
        var dimensions = new THREE.Vector3().copy(this.region.max).sub(this.region.min);
        var zero = new THREE.Vector3();
        if (dimensions.equals(zero)) {
            this.setEnclosingCube();
            dimensions.copy(this.region.max).sub(this.region.min);
        }
        //Check to see if the dimensions of the box are greater than the minimum dimensions
        if (dimensions.x <= this.minimumSize && dimensions.y <= this.minimumSize && dimensions.z <= this.minimumSize) {
            return;
        }
        var half = new THREE.Vector3().copy(dimensions).divideScalar(2.0);
        var center = new THREE.Vector3().copy(this.region.min).add(half);
        var octant = new Array(8);
        octant[0] = new THREE.Box3(this.region.min, center);
        octant[1] = new THREE.Box3(new THREE.Vector3(center.x, this.region.min.y, this.region.min.z), new THREE.Vector3(this.region.max.x, center.x, center.z));
        octant[2] = new THREE.Box3(new THREE.Vector3(center.x, this.region.min.y, center.z), new THREE.Vector3(this.region.max.x, center.x, this.region.max.z));
        octant[3] = new THREE.Box3(new THREE.Vector3(this.region.min.x, this.region.min.y, center.z), new THREE.Vector3(center.x, center.x, this.region.max.z));
        octant[4] = new THREE.Box3(new THREE.Vector3(this.region.min.x, center.x, this.region.min.z), new THREE.Vector3(center.x, this.region.max.y, center.z));
        octant[5] = new THREE.Box3(new THREE.Vector3(center.x, center.x, this.region.min.z), new THREE.Vector3(this.region.max.x, this.region.max.y, center.z));
        octant[6] = new THREE.Box3(center, this.region.max);
        octant[7] = new THREE.Box3(new THREE.Vector3(this.region.min.x, center.x, center.z), new THREE.Vector3(center.x, this.region.max.y, this.region.max.z));
        var octList = new Array(8);
        for (var i = 0; i < 8; i++) {
            octList[i] = new Array();
        }
        var delist = new Array();
        for (var o = 0; o < this.objects.length; o++) {
            var obj = this.objects[o];
            if (obj.bounds.boundingBox.min != obj.bounds.boundingBox.max) {
                for (var a = 0; a < 8; a++) {
                    if (octant[a].containsBox(obj.bounds.boundingBox)) {
                        octList[a].push(obj);
                        delist.push(obj);
                        break;
                    }
                }
            }
        }
        for (var d = 0; d < delist.length; d++) {
            this.objects.splice(this.objects.indexOf(delist[d]), 1);
        }
        for (var a = 0; a < 8; a++) {
            if (octList[a].length != 0) {
                this.octants[a] = this.createNode(octant[a], octList[a]);
                this.activeOctants |= (1 << a);
                this.octants[a].build();
            }
        }
        this.treeBuilt = true;
        this.treeReady = true;
    };
    return Octree;
})();