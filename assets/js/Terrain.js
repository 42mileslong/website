/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Rafi Long, Eric Shaffer
 *
 * Using code from Lab4 as starting point.
 */

/** Class implementing 3D terrain. */
class Terrain {
    /**
     * Initialize members of a Terrain object
     * @param {number} div Number of triangles along x axis and y axis
     * @param {number} iter Number of iterations to move vertexs
     * @param {number} delta Amount to raise/lower vertices per iteration
     * @param {number} minX Minimum X coordinate value
     * @param {number} maxX Maximum X coordinate value
     * @param {number} minY Minimum Y coordinate value
     * @param {number} maxY Maximum Y coordinate value
     */
    constructor(div,iter,delta,minX,maxX,minY,maxY) {
      this.div = div;
      this.iterations = iter;
      this.delta = delta;
      this.minX = minX;
      this.minY = minY;
      this.maxX = maxX;
      this.maxY = maxY;

      // Allocate vertex array
      this.vBuffer = [];
      // Allocate triangle array
      this.fBuffer = [];
      // Allocate normal array
      this.nBuffer = [];
      // Allocate array for edges so we can draw wireframe
      this.eBuffer = [];
      console.log("Terrain: Allocated buffers");

      this.generateTriangles();
      console.log("Terrain: Generated triangles");

      this.generateLines();
      console.log("Terrain: Generated lines");

      // Get extension for 4 byte integer indices for drwElements
      var ext = gl.getExtension('OES_element_index_uint');
      if (ext ==null){
          alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
      }
    }

    /**
     * Set the x,y,z coords of a vertex at location(i,j)
     * @param {Object} v an an array of length 3 holding x,y,z coordinates
     * @param {number} i the ith row of vertices
     * @param {number} j the jth column of vertices
     */
    setVertex(v,i,j) {
        var vid = 3*this.getVID(i, j);
        this.vBuffer[vid] = v[0];
        this.vBuffer[vid+1] = v[1];
        this.vBuffer[vid+2] = v[2];
    }

    /**
     * Return the x,y,z coordinates of a vertex at location (i,j)
     * @param {Object} v an an array of length 3 holding x,y,z coordinates
     * @param {number} i the ith row of vertices
     * @param {number} j the jth column of vertices
     */
    getVertex(v,i,j) {
        var vid = 3*this.getVID(i, j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid+1];
        v[2] = this.vBuffer[vid+2];
    }

    /**
     * Returns the index of a vertex for array indexing
     * @param {number} i the ith row of vertices
     * @param {number} j the jth column of vertices
     */
    getVID(i,j) {
      return i*(this.div+1) + j;
    }

    /**
     * Send the buffer objects to WebGL for rendering
     */
    loadBuffers() {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");

        //Setup Edges
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;

        console.log("triangulatedPlane: loadBuffers");
    }

    /**
     * Render the triangles
     */
    drawTriangles() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
     * Render the triangle edges wireframe style
     */
    drawEdges() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
     * Fill the vertex and buffer arrays
     */
    generateTriangles() {
        var deltaX = (this.maxX-this.minX)/this.div;
        var deltaY = (this.maxY-this.minY)/this.div;

        for (var i = 0; i <= this.div; i++) {
          for (var j = 0; j <= this.div; j++) {
            this.vBuffer.push(this.minX + deltaX*j);
            this.vBuffer.push(this.minY + deltaY*i);
            // Variations on generation:
            // this.vBuffer.push(Math.pow(deltaY*i, 4)/2);
            // this.vBuffer.push((this.minY + deltaY*i)/20);
            this.vBuffer.push(0);
          }
        }

        // Add random pertubations to flat plane
        for (var i = 0; i < this.iterations; i++) {
          this.partitionTriangles(0.005);
        }

        // Set minimum height for ocean level
        for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++) {
              var v = [];
              this.getVertex(v, i, j);
              v[2] = Math.max(-0.05, v[2]);
              this.setVertex(v, i, j);
            }
        }

        var normals = this.generateNormals();
        for (var i = 0; i <= this.div; i++) {
          for (var j = 0; j <= this.div; j++) {
            var normal = normals[this.getVID(i, j)];
            normal = vec3.normalize(normal, normal);
            this.nBuffer.push(normal[0]);
            this.nBuffer.push(normal[1]);
            this.nBuffer.push(normal[2]);
          }
        }

        for (var i = 0; i < this.div; i++) {
          for (var j = 0; j < this.div; j++) {
            var vid = this.getVID(i, j);
            this.fBuffer.push(vid);
            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+this.div+1);

            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+1+this.div+1);
            this.fBuffer.push(vid+this.div+1);
          }
        }

        this.numVertices = this.vBuffer.length/3;
        this.numFaces = this.fBuffer.length/3;
    }

    /**
     * Generate normal vectors by summing normals of faces with each vertex
     * Uses getVID to index into normals array
     */
    generateNormals() {
      // Initialize array
      var normals = []
      for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
          var vid = i*(this.div+1) + j;
          normals[vid] = vec3.create();
        }
      }

      for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
          // Add normals for first set of triangles
          var vid0 = this.getVID(i, j);
          var vid1 = this.getVID(i, j+1);
          var vid2 = this.getVID(i+1, j+1);

          var v0 = []
          this.getVertex(v0, i, j);
          var v1 = []
          this.getVertex(v1, i, j+1);
          var v2 = []
          this.getVertex(v2, i+1, j+1);

          var normal = vec3.create();
          vec3.normalize(normal,
            vec3.cross(normal,
              vec3.fromValues(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]),
              vec3.fromValues(v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2])
            )
          );

          vec3.add(normals[vid0], normals[vid0], normal);
          vec3.add(normals[vid1], normals[vid1], normal);
          vec3.add(normals[vid2], normals[vid2], normal);

          // Add normals for second set of triangles
          vid0 = this.getVID(i, j+1);
          vid1 = this.getVID(i+1, j+1);
          vid2 = this.getVID(i+1, j);

          v0 = []
          this.getVertex(v0, i, j);
          v1 = []
          this.getVertex(v1, i+1, j+1);
          v2 = []
          this.getVertex(v2, i+1, j+1);

          normal = vec3.create();
          vec3.normalize(normal,
            vec3.cross(normal,
              vec3.fromValues(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]),
              vec3.fromValues(v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2])
            )
          );

          vec3.add(normals[vid0], normals[vid0], normal);
          vec3.add(normals[vid1], normals[vid1], normal);
          vec3.add(normals[vid2], normals[vid2], normal);
        }
      }
      return normals;
    }

    /**
     * Partitions the triangles and raises/lowers by delta
     */
    partitionTriangles() {
      // Random point in the starting rectangle
      var p = vec3.fromValues(
        Math.random() * (this.maxX - this.minX) + this.minX,
        Math.random() * (this.maxY - this.minY) + this.minY,
        0
      );

      // Random normal
      var theta = Math.random() * 2 * Math.PI;
      var n = vec3.fromValues(
        Math.cos(theta),
        Math.sin(theta),
        0
      );

      for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
          var v = [];
          this.getVertex(v, i, j);

          if ((v[0] - p[0]) * n[0] + (v[1] - p[1]) * n[1] > 0) {
            v[2] += this.delta;
          } else {
            v[2] -= this.delta;
          }

          this.setVertex(v, i, j);
        }
      }
    }

    /**
     * Print vertices and triangles to console for debugging
     */
    printBuffers() {
      for (var i=0; i<this.numVertices; i++) {
             console.log("v ", this.vBuffer[i*3], " ",
                               this.vBuffer[i*3 + 1], " ",
                               this.vBuffer[i*3 + 2], " ");
      }

      for (var i=0; i<this.numFaces; i++) {
           console.log("f ", this.fBuffer[i*3], " ",
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");
      }
    }

    /**
     * Generates line values from faces in faceArray
     * to enable wireframe rendering
     */
    generateLines() {
        var numTris=this.fBuffer.length/3;
        for(var f=0; f<numTris; f++) {
            var fid=f*3;
            this.eBuffer.push(this.fBuffer[fid]);
            this.eBuffer.push(this.fBuffer[fid+1]);

            this.eBuffer.push(this.fBuffer[fid+1]);
            this.eBuffer.push(this.fBuffer[fid+2]);

            this.eBuffer.push(this.fBuffer[fid+2]);
            this.eBuffer.push(this.fBuffer[fid]);
        }
    }
}
