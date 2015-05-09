﻿class PyriteDetailLevel {
    Name: string;
    Value: number;
    Query: PyriteQuery;
    SetSize: THREE.Vector3;
    TextureSetSize: THREE.Vector2;
    ModelBoundsMin: THREE.Vector3;
    ModelBoundsMax: THREE.Vector3;
    WorldBoundsMax: THREE.Vector3;
    WorldBoundsMin: THREE.Vector3;
    WorldBoundsSize: THREE.Vector3;
    WorldCubeScale: THREE.Vector3;
    Cubes: Array<PyriteCube>;
    Octree: THREE.Octree;

    private
    meshes = [];
    meshesSearch = [];
    meshCountMax = 1000;
    radius = 500;
    radiusMax = this.radius * 10;
    radiusMaxHalf = this.radiusMax * 0.5;
    radiusSearch = 500;
    searchMesh: THREE.Mesh;
    baseR = 255;
    baseG = 0;
    baseB = 255;
    foundR = 0;
    foundG = 255;
    foundB = 0;
    adding = true;
    scene: THREE.Scene;
    rayCaster = new THREE.Raycaster();
    origin = new THREE.Vector3();
    direction = new THREE.Vector3();

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        this.Octree = new THREE.Octree({
            undeferred: false,
            depthMax: Infinity,
            objectsThreshold: 8,
            overlapPct: 0.15,
            scene: this.scene
        });
    }

    update(camera: THREE.Camera) {
        if (this.Octree.nodeCount > 1) {
            this.searchOctree(camera);
            this.Octree.update();
        }
    }

    loadVisibleCubes(scene: THREE.Scene) {

    }

    loadCubes() {
        var cubes = this.Cubes;
        cubes.forEach((c) => {
            c.load(this.scene, this.Octree);
        });
    }

    searchOctree = function searchOctree(camera: THREE.Camera) {

        var i, il;
			
        // revert previous search objects to base color
			
        for (i = 0, il = this.meshesSearch.length; i < il; i++) {

            //this.meshesSearch[i].object.material.color.setRGB(this.baseR, this.baseG, this.baseB);
            this.meshesSearch[i].object.visible = false;
        }
			
        // new search position
        //this.searchMesh.position.set(
        //    Math.random() * this.radiusMax - this.radiusMaxHalf,
        //    Math.random() * this.radiusMax - this.radiusMaxHalf,
        //    Math.random() * this.radiusMax - this.radiusMaxHalf
        //    );
			
        // record start time
			
        var timeStart = Date.now();
			
        // search octree from search mesh position with search radius
        // optional third parameter: boolean, if should sort results by object when using faces in octree
        // optional fourth parameter: vector3, direction of search when using ray (assumes radius is distance/far of ray)
			
        //this.origin.copy(this.searchMesh.position);
        this.origin.copy(camera.position);
        //this.direction.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
        this.direction = new THREE.Vector3(0, 0, -1);
        this.direction.applyQuaternion(camera.quaternion);
        this.rayCaster.set(this.origin, this.direction);
        this.meshesSearch = this.Octree.search(this.rayCaster.ray.origin, this.radiusSearch, true, this.rayCaster.ray.direction);
        var intersections = this.rayCaster.intersectOctreeObjects(this.meshesSearch);
			
        // record end time
			
        var timeEnd = Date.now();
			
        // set color of all meshes found in search
			
        for (i = 0, il = this.meshesSearch.length; i < il; i++) {

            //this.meshesSearch[i].object.material.color.setRGB(this.foundR, this.foundG, this.foundB);
            this.meshesSearch[i].object.visible = true;
        }
			
        /*
    	
        // results to console
    	
        console.log( 'OCTREE: ', octree );
        console.log( '... searched ', meshes.length, ' and found ', meshesSearch.length, ' with intersections ', intersections.length, ' and took ', ( timeEnd - timeStart ), ' ms ' );
    	
        */

    }


    TextureCoordinatesForCube(cubeX, cubeY): THREE.Vector2 {
        var textureXPosition = (cubeX / (this.SetSize.x / this.TextureSetSize.x));
        var textureYPosition = (cubeY / (this.SetSize.y / this.TextureSetSize.y)); 
        return new THREE.Vector2(Math.floor(textureXPosition), Math.floor(textureYPosition));
    }

    GetWorldCoordinatesForCube(cube: PyriteCube): THREE.Vector3 {
        var xPos = this.WorldBoundsMin.x + this.WorldCubeScale.x * cube.X +
            this.WorldCubeScale.x * 0.5;
        var yPos = this.WorldBoundsMin.y + this.WorldCubeScale.y * cube.Y +
            this.WorldCubeScale.y * 0.5;
        var zPos = this.WorldBoundsMin.z + this.WorldCubeScale.z * cube.Z +
            this.WorldCubeScale.z * 0.5;
        return new THREE.Vector3(xPos, yPos, zPos);
    }
} 