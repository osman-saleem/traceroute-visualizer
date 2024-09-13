import * as THREE from '/build/three.module.js';
import {OrbitControls} from '/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
const canvas = document.querySelector('#bg');
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(innerWidth,innerHeight);
camera.position.set(0,0,2.5);
const controls = new OrbitControls(camera,renderer.domElement);

// Function to handle window resizing
function onWindowResize() {
  // Update the renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Update the camera aspect ratio and projection matrix
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// Add event listener for window resize
window.addEventListener('resize', onWindowResize);


// earth
// const sphere = new THREE.Mesh(
//   new THREE.SphereGeometry(1,100,1000),
//   new THREE.MeshBasicMaterial({
//     map: new THREE.TextureLoader().load("earth.jpg")
//   })
// )
// scene.add(sphere);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1,100,1000),
  new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vertexUV;
      varying vec3 vertexNormal;

      void main() {
        vertexUV = uv;
        vertexNormal = normalize(normalMatrix * normal); // Convert normal to world space

        // Output final position of the vertex
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D globeTexture;

      varying vec2 vertexUV;
      varying vec3 vertexNormal;


      void main() {

        // Adjust the intensity
        float intensity = 1.2 - dot(vertexNormal, vec3(0.0,0.0,1.0));
        vec3 atmosphere = vec3(0.3, 0.6, 1.0) * pow(intensity, 1.5);

        // Combine atmosphere effect with the texture
        gl_FragColor = vec4(atmosphere + texture2D(globeTexture, vertexUV).xyz, 1.0);

      }
    `,
    uniforms: {
      globeTexture: {
        value: new THREE.TextureLoader().load("8081_earthmap10k.jpg")
      },
      cameraPos: { 
        value: camera.position 
      }
    },
  })
)
scene.add(sphere)

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1,100,1000),
  new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vertexNormal;

      void main() {
        vertexNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vertexNormal;

      void main() {
        float intensity = pow(0.5 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
)
atmosphere.scale.set(1.2, 1.2, 1.2)
scene.add(atmosphere)



// pin
function getPin(lat, lng){
  var pin = new THREE.Mesh(
    new THREE.SphereGeometry(0.01,4,4),
    new THREE.MeshBasicMaterial({color: 0xFF0000})
  )
  let coords = LLtoC(lat,lng);
  pin.position.set(coords[0],coords[1],coords[2])
  return pin;
}

function LLtoC(latitude, longitude) {
  // Convert latitude and longitude from degrees to radians
  const latRad = THREE.MathUtils.degToRad(latitude);
  const lonRad = -THREE.MathUtils.degToRad(longitude);

  // Calculate Cartesian coordinates
  const x = 1 * Math.cos(latRad) * Math.cos(lonRad);
  const y = 1 * Math.sin(latRad);
  const z = 1 * Math.cos(latRad) * Math.sin(lonRad);

  return([x,y,z]);
}

function getCurve(pin1,pin2){
  let p1 = pin1.position;
  let p2 = pin2.position;
  let v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
  let v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
  let points = [];
  for(let i = 0; i <= 20; i++){
    var p = new THREE.Vector3().lerpVectors(v1, v2, i/20);
    p.normalize(); //make all points lie on surface of sphere
    p.multiplyScalar(1 + 0.05*Math.sin(Math.PI*i/20))
    points.push(p);
  }

  let path = new THREE.CatmullRomCurve3(points)
  const curve = new THREE.Mesh(
    new THREE.TubeGeometry(path, 20, 0.002, 8, false),
    new THREE.MeshBasicMaterial({color: 0x00FF00})
  )
  return curve;
}

const API_KEY = "bd89924fb0004515ad776b73189bc523";

var pins = [];
var curves = [];

console.log(pins)
console.log(curves)

// given a list of IPs, convert them to lat/long and add to pin list
async function updatePins(ips) {
  console.log("in updatePins function. ips: ")
  console.log(ips)
  //console.log(pins)
  //console.log(curves)
  for(let pin in pins) {
    //console.log(pins[pin])
    sphere.remove(pins[pin])
  }
  for(let curve in curves) {
    //console.log(curves[curve])
    sphere.remove(curves[curve])
  }
  pins = []
  curves = []
  for(let x in ips){
    console.log("ip " + x + " " + ips[x])
    // get lat and long of each IP
    let url = "https://api.ipgeolocation.io/ipgeo?apiKey=" + API_KEY + "&ip=" + String(ips[x]);
    console.log(url);
    await fetch(url)
      .then(r => r.json())
      .then(r => {
        console.log(r)
        let lat = parseInt(r.latitude);
        //let lng = Math.abs(parseInt(r.longitude)) + 90;
        let lng = parseInt(r.longitude);
        //console.log(lat + " " + -(lng - 90) + " " + r.city + " " + r.country_name);
        console.log(lat + " " + lng + " " + r.city + " " + r.country_name);
        
        var pin = getPin(lat,lng)
        
        pins.push(pin);
        sphere.add(pin);
    })
  }
  //console.log(pins)
  for(let x = 0; x < pins.length - 1; x++){
    var curve = getCurve(pins[x], pins[x+1]);
    curves.push(curve);
    sphere.add(curve);
  }
}

var test_ips = [
  '207.6.2.1',
  '154.11.2.83',
  '168.143.191.134',
  '129.250.2.98',
  '129.250.4.143',
  '129.250.7.54',
  '61.120.146.74'
]

var test_locs = [[49,-122],[49,-123],[47,-122],[47,-122],[35,139],[35,139]]



async function updatePinsTest() {
  for(let x in test_locs) {
    let lat = test_locs[x][0]
    let lng = test_locs[x][1]
    var pin = getPin(lat,lng)
    pins.push(pin);
    sphere.add(pin);
  }
  for(let x = 0; x < pins.length - 1; x++){
    var curve = getCurve(pins[x], pins[x+1]);
    curves.push(curve);
    sphere.add(curve);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  updatePinsTest();
  // Receive data from the server
  socket.on('tracerouteData', (ipList) => {
    console.log('IPs received from server:', ipList);
    // Use ipList to update the 3D globe
    updatePins(ipList.results);
  });

  document.getElementById('domain_form').addEventListener('submit', (event) => {
    event.preventDefault();
    const domain = document.getElementById('domain').value;
    socket.emit('formSubmit', {domain});
    document.getElementById('myForm').reset();
  })

});

function animate() {
  requestAnimationFrame(animate);
  sphere.material.uniforms.cameraPos.value.copy(camera.position);
  renderer.render(scene, camera);
  controls.update();
  //sphere.rotateY(0.002)
}
animate();
